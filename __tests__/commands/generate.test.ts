import { describe, it, expect, vi, beforeEach } from "vitest";
import { Command } from "commander";
import { registerGenerateCommand } from "../../src/commands/generate.js";

// ─── Mock 所有外部依赖 ──────────────────────────────────────────────

vi.mock("../../src/config/index.js", () => ({
  getConfig: vi.fn((key: string) => {
    const config: Record<string, string> = {
      apiKey: "test-api-key",
      baseUrl: "https://api.test.com/v1",
      provider: "openai",
      modelName: "gpt-4o-test",
      locale: "zh-CN",
      defaultOutputDir: ".",
    };
    return config[key] || "";
  }),
  getLLMConfig: vi.fn(() => ({
    apiKey: "test-api-key",
    baseUrl: "https://api.test.com/v1",
    provider: "openai",
    modelName: "gpt-4o-test",
  })),
}));

vi.mock("../../src/core/ai.js", () => ({
  generateInfographicDSL: vi.fn(),
  retryWithCorrection: vi.fn(),
  MAX_RETRIES: 3,
}));

vi.mock("../../src/core/render.js", () => ({
  renderDSLToSVG: vi.fn(),
  writeSVGFile: vi.fn(),
  resolveOutputPath: vi.fn(
    (p?: string) => p || "infographic-20260220-120000.svg",
  ),
}));

vi.mock("../../src/utils/file-reader.js", () => ({
  extractTextFromFile: vi.fn(),
}));

// Mock node:fs/promises 用于 --from-dsl 模式
vi.mock("node:fs/promises", () => ({
  default: {
    readFile: vi.fn(),
  },
}));

vi.mock("../../src/utils/logger.js", () => ({
  info: vi.fn(),
  success: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  dim: vi.fn(),
  bold: vi.fn((s: string) => s),
  label: vi.fn(),
}));

vi.mock("../../src/utils/spinner.js", () => ({
  startSpinner: vi.fn(),
  succeedSpinner: vi.fn(),
  failSpinner: vi.fn(),
  updateSpinner: vi.fn(),
  stopSpinner: vi.fn(),
}));

import {
  generateInfographicDSL,
  retryWithCorrection,
} from "../../src/core/ai.js";
import { renderDSLToSVG, writeSVGFile } from "../../src/core/render.js";
import { extractTextFromFile } from "../../src/utils/file-reader.js";
import fs from "node:fs/promises";
import * as log from "../../src/utils/logger.js";
import * as spinner from "../../src/utils/spinner.js";

describe("commands/generate", () => {
  let program: Command;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    program = new Command();
    program.exitOverride();
    registerGenerateCommand(program);

    exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("process.exit called");
    }) as never);
  });

  describe("registerGenerateCommand()", () => {
    it("应注册 generate 命令", () => {
      const cmd = program.commands.find(
        (c) => c.name() === "generate" || c.aliases().includes("gen"),
      );
      expect(cmd).toBeDefined();
    });

    it("generate 命令应有 g 别名", () => {
      const cmd = program.commands.find((c) => c.name() === "generate");
      expect(cmd?.aliases()).toContain("g");
    });

    it("应有 -o/--output 选项", () => {
      const cmd = program.commands.find((c) => c.name() === "generate");
      const outputOpt = cmd?.options.find((o) => o.long === "--output");
      expect(outputOpt).toBeDefined();
    });
  });

  describe("成功流程", () => {
    it("应完成完整的 生成→渲染→写入 流程", async () => {
      const dsl = "infographic list-grid-badge-card\ndata\n  title Test";
      const svg = "<svg>test</svg>";

      vi.mocked(generateInfographicDSL).mockResolvedValue(dsl);
      vi.mocked(renderDSLToSVG).mockResolvedValue(svg);
      vi.mocked(writeSVGFile).mockResolvedValue();

      await program.parseAsync([
        "node",
        "test",
        "generate",
        "画一个列表",
        "-o",
        "out.svg",
      ]);

      expect(generateInfographicDSL).toHaveBeenCalledWith(
        "画一个列表",
        undefined,
      );
      expect(renderDSLToSVG).toHaveBeenCalledWith(dsl);
      expect(writeSVGFile).toHaveBeenCalledWith("out.svg", svg);
      expect(spinner.succeedSpinner).toHaveBeenCalled();
      expect(log.success).toHaveBeenCalled();
    });

    it("使用别名 g 也应正常工作", async () => {
      vi.mocked(generateInfographicDSL).mockResolvedValue("infographic test");
      vi.mocked(renderDSLToSVG).mockResolvedValue("<svg>ok</svg>");
      vi.mocked(writeSVGFile).mockResolvedValue();

      await program.parseAsync(["node", "test", "g", "测试", "-o", "test.svg"]);

      expect(generateInfographicDSL).toHaveBeenCalledWith("测试", undefined);
    });
  });

  describe("AI 调用失败", () => {
    it("AI 调用失败时应 failSpinner 并退出", async () => {
      vi.mocked(generateInfographicDSL).mockRejectedValue(
        new Error("网络超时"),
      );

      await expect(
        program.parseAsync(["node", "test", "generate", "测试"]),
      ).rejects.toThrow();

      expect(spinner.failSpinner).toHaveBeenCalledWith("AI 调用失败");
      expect(log.error).toHaveBeenCalled();
    });
  });

  describe("自我修正流程", () => {
    it("渲染首次失败后应自动重试", async () => {
      const dsl1 = "infographic bad-syntax";
      const dsl2 = "infographic list-grid-badge-card\ndata\n  title Fixed";

      vi.mocked(generateInfographicDSL).mockResolvedValue(dsl1);
      vi.mocked(renderDSLToSVG)
        .mockRejectedValueOnce(new Error("Invalid template"))
        .mockResolvedValueOnce("<svg>fixed</svg>");
      vi.mocked(retryWithCorrection).mockResolvedValue(dsl2);
      vi.mocked(writeSVGFile).mockResolvedValue();

      await program.parseAsync([
        "node",
        "test",
        "generate",
        "测试",
        "-o",
        "out.svg",
      ]);

      expect(retryWithCorrection).toHaveBeenCalledTimes(1);
      expect(writeSVGFile).toHaveBeenCalledWith("out.svg", "<svg>fixed</svg>");
    });

    it("多次渲染失败应多次重试", async () => {
      const originalDSL = "infographic bad";
      const fixedDSL1 = "infographic still-bad";
      const fixedDSL2 = "infographic fixed";

      vi.mocked(generateInfographicDSL).mockResolvedValue(originalDSL);
      vi.mocked(renderDSLToSVG)
        .mockRejectedValueOnce(new Error("Error 1"))
        .mockRejectedValueOnce(new Error("Error 2"))
        .mockResolvedValueOnce("<svg>ok</svg>");
      vi.mocked(retryWithCorrection)
        .mockResolvedValueOnce(fixedDSL1)
        .mockResolvedValueOnce(fixedDSL2);
      vi.mocked(writeSVGFile).mockResolvedValue();

      await program.parseAsync([
        "node",
        "test",
        "generate",
        "测试",
        "-o",
        "out.svg",
      ]);

      expect(retryWithCorrection).toHaveBeenCalledTimes(2);
      expect(spinner.succeedSpinner).toHaveBeenCalled();
    });
  });

  describe("文件写入失败", () => {
    it("文件写入失败时应 failSpinner 并退出", async () => {
      vi.mocked(generateInfographicDSL).mockResolvedValue("infographic test");
      vi.mocked(renderDSLToSVG).mockResolvedValue("<svg>ok</svg>");
      vi.mocked(writeSVGFile).mockRejectedValue(new Error("Permission denied"));

      await expect(
        program.parseAsync([
          "node",
          "test",
          "generate",
          "测试",
          "-o",
          "out.svg",
        ]),
      ).rejects.toThrow();

      expect(spinner.failSpinner).toHaveBeenCalledWith("文件写入失败");
    });
  });

  describe("文件上下文功能 (-f)", () => {
    it("应有 -f/--file 选项", () => {
      const cmd = program.commands.find((c) => c.name() === "generate");
      const fileOpt = cmd?.options.find((o) => o.long === "--file");
      expect(fileOpt).toBeDefined();
    });

    it("传入 -f 时应读取文件并拼接上下文", async () => {
      const fileText = "这是一份年终总结报告";
      vi.mocked(extractTextFromFile).mockResolvedValue({
        text: fileText,
        truncated: false,
      });
      vi.mocked(generateInfographicDSL).mockResolvedValue(
        "infographic list-grid-badge-card\ndata\n  title Test",
      );
      vi.mocked(renderDSLToSVG).mockResolvedValue("<svg>ok</svg>");
      vi.mocked(writeSVGFile).mockResolvedValue();

      await program.parseAsync([
        "node",
        "test",
        "generate",
        "总结成时间轴",
        "-f",
        "report.md",
        "-o",
        "out.svg",
      ]);

      expect(extractTextFromFile).toHaveBeenCalledWith("report.md");
      expect(generateInfographicDSL).toHaveBeenCalledWith(
        "总结成时间轴",
        fileText,
      );
      expect(spinner.succeedSpinner).toHaveBeenCalled();
    });

    it("文件截断时应输出警告", async () => {
      vi.mocked(extractTextFromFile).mockResolvedValue({
        text: "truncated content",
        truncated: true,
      });
      vi.mocked(generateInfographicDSL).mockResolvedValue(
        "infographic list-grid-badge-card\ndata\n  title Test",
      );
      vi.mocked(renderDSLToSVG).mockResolvedValue("<svg>ok</svg>");
      vi.mocked(writeSVGFile).mockResolvedValue();

      await program.parseAsync([
        "node",
        "test",
        "generate",
        "测试",
        "-f",
        "big.pdf",
        "-o",
        "out.svg",
      ]);

      expect(log.warn).toHaveBeenCalled();
    });

    it("文件读取失败时应退出", async () => {
      vi.mocked(extractTextFromFile).mockRejectedValue(new Error("文件未找到"));

      await expect(
        program.parseAsync([
          "node",
          "test",
          "generate",
          "测试",
          "-f",
          "not-exist.md",
        ]),
      ).rejects.toThrow();

      expect(log.error).toHaveBeenCalled();
    });

    it("不传 -f 时不应调用 extractTextFromFile", async () => {
      vi.mocked(generateInfographicDSL).mockResolvedValue(
        "infographic list-grid-badge-card\ndata\n  title Test",
      );
      vi.mocked(renderDSLToSVG).mockResolvedValue("<svg>ok</svg>");
      vi.mocked(writeSVGFile).mockResolvedValue();

      await program.parseAsync([
        "node",
        "test",
        "generate",
        "测试",
        "-o",
        "out.svg",
      ]);

      expect(extractTextFromFile).not.toHaveBeenCalled();
      expect(generateInfographicDSL).toHaveBeenCalledWith("测试", undefined);
    });
  });

  describe("从 DSL 文件直接渲染 (--from-dsl)", () => {
    it("应有 --from-dsl 选项", () => {
      const cmd = program.commands.find((c) => c.name() === "generate");
      const fromDslOpt = cmd?.options.find((o) => o.long === "--from-dsl");
      expect(fromDslOpt).toBeDefined();
    });

    it("应直接读取 DSL 文件并渲染，跳过 AI", async () => {
      const dslContent = "infographic list-grid-badge-card\ndata\n  title Test";
      vi.mocked(fs.readFile).mockResolvedValue(dslContent as any);
      vi.mocked(renderDSLToSVG).mockResolvedValue("<svg>rendered</svg>");
      vi.mocked(writeSVGFile).mockResolvedValue();

      await program.parseAsync([
        "node",
        "test",
        "generate",
        "--from-dsl",
        "my-syntax.txt",
        "-o",
        "out.svg",
      ]);

      // 不应调用 AI
      expect(generateInfographicDSL).not.toHaveBeenCalled();
      // 应调用渲染
      expect(renderDSLToSVG).toHaveBeenCalledWith(dslContent);
      expect(writeSVGFile).toHaveBeenCalledWith(
        "out.svg",
        "<svg>rendered</svg>",
      );
      expect(spinner.succeedSpinner).toHaveBeenCalled();
    });

    it("DSL 文件不存在时应退出", async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error("ENOENT"));

      await expect(
        program.parseAsync([
          "node",
          "test",
          "generate",
          "--from-dsl",
          "not-exist.txt",
        ]),
      ).rejects.toThrow();

      expect(log.error).toHaveBeenCalled();
      expect(generateInfographicDSL).not.toHaveBeenCalled();
    });

    it("DSL 文件为空时应退出", async () => {
      vi.mocked(fs.readFile).mockResolvedValue("   " as any);

      await expect(
        program.parseAsync([
          "node",
          "test",
          "generate",
          "--from-dsl",
          "empty.txt",
        ]),
      ).rejects.toThrow();

      expect(log.error).toHaveBeenCalled();
    });

    it("渲染失败时应退出", async () => {
      vi.mocked(fs.readFile).mockResolvedValue(
        "infographic list-grid-badge-card" as any,
      );
      vi.mocked(renderDSLToSVG).mockRejectedValue(
        new Error("SSR render failed"),
      );

      await expect(
        program.parseAsync([
          "node",
          "test",
          "generate",
          "--from-dsl",
          "bad.txt",
          "-o",
          "out.svg",
        ]),
      ).rejects.toThrow();

      expect(spinner.failSpinner).toHaveBeenCalled();
    });

    it("--from-dsl 模式不需要 prompt 参数", async () => {
      const dslContent = "infographic list-grid-badge-card\ndata\n  title OK";
      vi.mocked(fs.readFile).mockResolvedValue(dslContent as any);
      vi.mocked(renderDSLToSVG).mockResolvedValue("<svg>ok</svg>");
      vi.mocked(writeSVGFile).mockResolvedValue();

      // 不传 prompt，只传 --from-dsl
      await program.parseAsync([
        "node",
        "test",
        "generate",
        "--from-dsl",
        "syntax.txt",
        "-o",
        "out.svg",
      ]);

      expect(generateInfographicDSL).not.toHaveBeenCalled();
      expect(writeSVGFile).toHaveBeenCalled();
    });
  });
});
