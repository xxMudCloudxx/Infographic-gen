import { describe, it, expect, vi, beforeEach } from "vitest";
import { Command } from "commander";
import { registerGenerateCommand } from "../../src/commands/generate.js";

// ─── Mock 所有外部依赖 ──────────────────────────────────────────────

vi.mock("../../src/core/ai.js", () => ({
  generateInfographicDSL: vi.fn(),
  retryWithCorrection: vi.fn(),
  MAX_RETRIES: 3,
}));

vi.mock("../../src/core/render.js", () => ({
  renderDSLToSVG: vi.fn(),
  writeSVGFile: vi.fn(),
  resolveOutputPath: vi.fn((p?: string) => p || "infographic-output.svg"),
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

    it("generate 命令应有 gen 别名", () => {
      const cmd = program.commands.find((c) => c.name() === "generate");
      expect(cmd?.aliases()).toContain("gen");
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

      expect(generateInfographicDSL).toHaveBeenCalledWith("画一个列表");
      expect(renderDSLToSVG).toHaveBeenCalledWith(dsl);
      expect(writeSVGFile).toHaveBeenCalledWith("out.svg", svg);
      expect(spinner.succeedSpinner).toHaveBeenCalled();
      expect(log.success).toHaveBeenCalled();
    });

    it("使用别名 gen 也应正常工作", async () => {
      vi.mocked(generateInfographicDSL).mockResolvedValue("infographic test");
      vi.mocked(renderDSLToSVG).mockResolvedValue("<svg>ok</svg>");
      vi.mocked(writeSVGFile).mockResolvedValue();

      await program.parseAsync([
        "node",
        "test",
        "gen",
        "测试",
        "-o",
        "test.svg",
      ]);

      expect(generateInfographicDSL).toHaveBeenCalledWith("测试");
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
});
