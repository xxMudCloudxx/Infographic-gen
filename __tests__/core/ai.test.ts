import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock 外部依赖 ──────────────────────────────────────────────────

// Mock config
vi.mock("../../src/config/index.js", () => ({
  getLLMConfig: vi.fn(() => ({
    apiKey: "test-api-key",
    baseUrl: "https://api.test.com/v1",
    provider: "openai",
    modelName: "gpt-4o-test",
  })),
}));

// Mock logger & spinner（静默测试输出）
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

// Mock OpenAI — vi.hoisted 保证变量在 vi.mock 工厂之前初始化
const { mockCreate, MockOpenAI } = vi.hoisted(() => {
  const mockCreate = vi.fn();
  class MockOpenAI {
    chat = {
      completions: {
        create: mockCreate,
      },
    };
    constructor(_opts: any) {}
  }
  return { mockCreate, MockOpenAI };
});

vi.mock("openai", () => ({
  default: MockOpenAI,
}));

import {
  generateInfographicDSL,
  retryWithCorrection,
  MAX_RETRIES,
} from "../../src/core/ai.js";
import { getLLMConfig } from "../../src/config/index.js";

describe("core/ai", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("MAX_RETRIES", () => {
    it("应为正整数", () => {
      expect(MAX_RETRIES).toBeGreaterThan(0);
      expect(Number.isInteger(MAX_RETRIES)).toBe(true);
    });

    it("默认值应为 3", () => {
      expect(MAX_RETRIES).toBe(3);
    });
  });

  describe("generateInfographicDSL()", () => {
    it("应成功生成 DSL", async () => {
      const dsl = `infographic list-grid-badge-card
data
  title Test
  lists
    - label Item 1`;

      mockCreate.mockResolvedValue({
        choices: [{ message: { content: dsl } }],
      });

      const result = await generateInfographicDSL("生成一个测试列表");
      expect(result).toContain("infographic list-grid-badge-card");
      expect(result).toContain("title Test");
    });

    it("应自动清理 Markdown 代码块", async () => {
      const dslWithCodeBlock =
        "```\ninfographic list-grid-badge-card\ndata\n  title Test\n```";

      mockCreate.mockResolvedValue({
        choices: [{ message: { content: dslWithCodeBlock } }],
      });

      const result = await generateInfographicDSL("测试");
      expect(result).not.toContain("```");
      expect(result).toMatch(/^infographic /);
    });

    it("应清理带语言标识的代码块", async () => {
      const dsl =
        "```dsl\ninfographic chart-column-simple\ndata\n  values\n    - label A\n      value 10\n```";

      mockCreate.mockResolvedValue({
        choices: [{ message: { content: dsl } }],
      });

      const result = await generateInfographicDSL("测试");
      expect(result).not.toContain("```");
      expect(result).toMatch(/^infographic /);
    });

    it("应跳过 infographic 之前的噪声文本", async () => {
      const dslWithPreamble =
        "好的，这是你要的信息图：\ninfographic compare-swot\ndata\n  title SWOT";

      mockCreate.mockResolvedValue({
        choices: [{ message: { content: dslWithPreamble } }],
      });

      const result = await generateInfographicDSL("SWOT 分析");
      expect(result).toMatch(/^infographic compare-swot/);
    });

    it("LLM 返回空内容时应抛出错误", async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: "" } }],
      });

      await expect(generateInfographicDSL("测试")).rejects.toThrow(
        "LLM 返回了空内容",
      );
    });

    it("LLM 返回 null content 时应抛出错误", async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: null } }],
      });

      await expect(generateInfographicDSL("测试")).rejects.toThrow(
        "LLM 返回了空内容",
      );
    });

    it("choices 为空数组时应抛出错误", async () => {
      mockCreate.mockResolvedValue({ choices: [] });

      await expect(generateInfographicDSL("测试")).rejects.toThrow(
        "LLM 返回了空内容",
      );
    });

    it("API 调用失败时应抛出错误", async () => {
      mockCreate.mockRejectedValue(new Error("API rate limit exceeded"));

      await expect(generateInfographicDSL("测试")).rejects.toThrow(
        "API rate limit exceeded",
      );
    });

    it("未配置 API Key 时应抛出友好错误", async () => {
      vi.mocked(getLLMConfig).mockReturnValue({
        apiKey: "",
        baseUrl: "https://api.test.com/v1",
        provider: "openai",
        modelName: "gpt-4o",
      });

      await expect(generateInfographicDSL("测试")).rejects.toThrow(
        "尚未配置 API Key",
      );

      // 恢复
      vi.mocked(getLLMConfig).mockReturnValue({
        apiKey: "test-api-key",
        baseUrl: "https://api.test.com/v1",
        provider: "openai",
        modelName: "gpt-4o-test",
      });
    });

    it("应使用正确的 model 参数", async () => {
      const dsl = "infographic list-grid-badge-card\ndata\n  title Test";
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: dsl } }],
      });

      await generateInfographicDSL("测试");

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gpt-4o-test",
        }),
      );
    });

    it("应传递 system prompt 和 user prompt", async () => {
      const dsl = "infographic list-grid-badge-card\ndata\n  title Test";
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: dsl } }],
      });

      await generateInfographicDSL("画一个列表");

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: "system" }),
            expect.objectContaining({ role: "user", content: "画一个列表" }),
          ]),
        }),
      );
    });
  });

  describe("retryWithCorrection()", () => {
    it("应成功返回修正后的 DSL", async () => {
      const correctedDSL =
        "infographic list-grid-badge-card\ndata\n  title Fixed";

      mockCreate.mockResolvedValue({
        choices: [{ message: { content: correctedDSL } }],
      });

      const result = await retryWithCorrection(
        "infographic bad-template\ndata",
        "Unknown template: bad-template",
        "画一个列表",
        1,
      );

      expect(result).toContain("infographic list-grid-badge-card");
    });

    it("超过最大重试次数时应抛出错误", async () => {
      await expect(
        retryWithCorrection("syntax", "error", "prompt", MAX_RETRIES + 1),
      ).rejects.toThrow(`已重试 ${MAX_RETRIES} 次`);
    });

    it("修正请求应包含原始语法和错误信息", async () => {
      const correctedDSL =
        "infographic chart-column-simple\ndata\n  values\n    - label A\n      value 10";
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: correctedDSL } }],
      });

      await retryWithCorrection(
        "infographic bad-syntax",
        "RenderError: invalid template",
        "画一个图表",
        1,
      );

      const callArgs = mockCreate.mock.calls[0][0];
      const messages = callArgs.messages;

      // 应包含 system + user + assistant(原始语法) + user(修正请求)
      expect(messages).toHaveLength(4);
      expect(messages[0].role).toBe("system");
      expect(messages[1].role).toBe("user");
      expect(messages[2].role).toBe("assistant");
      expect(messages[2].content).toBe("infographic bad-syntax");
      expect(messages[3].role).toBe("user");
      expect(messages[3].content).toContain("RenderError: invalid template");
    });

    it("在最大重试边界（attempt === MAX_RETRIES）应仍可执行", async () => {
      const correctedDSL =
        "infographic list-grid-badge-card\ndata\n  title Fixed";
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: correctedDSL } }],
      });

      // 边界值 —— MAX_RETRIES 应该还能执行
      const result = await retryWithCorrection(
        "syntax",
        "error",
        "prompt",
        MAX_RETRIES,
      );
      expect(result).toContain("infographic");
    });
  });
});
