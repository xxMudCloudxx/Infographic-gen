import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "node:path";

// ─── Mock 外部依赖 ──────────────────────────────────────────────────

vi.mock("../../src/config/index.js", () => ({
  getConfig: vi.fn((key: string) => {
    const config: Record<string, string> = {
      apiKey: "test-api-key",
      baseUrl: "https://api.test.com/v1",
      provider: "openai",
      modelName: "gpt-4o-test",
      locale: "zh-CN",
      defaultOutputDir: ".",
      maxFileChars: "30000",
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

// Mock node:fs/promises
vi.mock("node:fs/promises", () => ({
  default: {
    access: vi.fn(),
    readFile: vi.fn(),
    stat: vi.fn(),
  },
}));

// Mock mammoth
vi.mock("mammoth", () => ({
  default: {
    extractRawText: vi.fn(),
  },
}));

// Mock pdf-parse — 使用 vi.hoisted 保证 mock 变量在 vi.mock 之前初始化
const { mockGetText, MockPDFParse } = vi.hoisted(() => {
  const mockGetText = vi.fn();
  class MockPDFParse {
    constructor(_opts: any) {}
    getText = mockGetText;
  }
  return { mockGetText, MockPDFParse };
});

vi.mock("pdf-parse", () => ({
  PDFParse: MockPDFParse,
}));

import fs from "node:fs/promises";
import mammoth from "mammoth";
import { extractTextFromFile } from "../../src/utils/file-reader.js";
import { getConfig } from "../../src/config/index.js";

describe("utils/file-reader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 默认 stat 返回合法文件大小
    vi.mocked(fs.stat).mockResolvedValue({
      size: 1024,
    } as any);
  });

  describe("extractTextFromFile()", () => {
    // ─── 扩展名检查 ─────────────────────────────────────────────────

    it("不支持的扩展名应抛出错误", async () => {
      await expect(extractTextFromFile("test.xlsx")).rejects.toThrow(
        "暂不支持 .xlsx 格式的文件",
      );
    });

    it("不支持的扩展名错误应包含支持的格式列表", async () => {
      await expect(extractTextFromFile("test.pptx")).rejects.toThrow(
        ".md, .txt, .json, .csv, .docx, .pdf",
      );
    });

    // ─── 文件不存在 ─────────────────────────────────────────────────

    it("文件不存在时应抛出友好错误", async () => {
      vi.mocked(fs.stat).mockRejectedValue(new Error("ENOENT"));

      await expect(extractTextFromFile("not-exist.md")).rejects.toThrow(
        "文件未找到",
      );
    });

    // ─── 文件过大 ─────────────────────────────────────────────────

    it("文件超过 10MB 时应抛出错误", async () => {
      vi.mocked(fs.stat).mockResolvedValue({
        size: 11 * 1024 * 1024,
      } as any);

      await expect(extractTextFromFile("huge.md")).rejects.toThrow("文件过大");
    });

    // ─── Markdown / 纯文本 ──────────────────────────────────────────

    it("应正确读取 .md 文件", async () => {
      const content = "# Hello\n\nWorld";
      vi.mocked(fs.readFile).mockResolvedValue(content as any);

      const result = await extractTextFromFile("test.md");
      expect(result.text).toBe(content);
      expect(result.truncated).toBe(false);
    });

    it("应正确读取 .txt 文件", async () => {
      const content = "Plain text content";
      vi.mocked(fs.readFile).mockResolvedValue(content as any);

      const result = await extractTextFromFile("test.txt");
      expect(result.text).toBe(content);
      expect(result.truncated).toBe(false);
    });

    it("应正确读取 .json 文件", async () => {
      const content = '{"key": "value"}';
      vi.mocked(fs.readFile).mockResolvedValue(content as any);

      const result = await extractTextFromFile("data.json");
      expect(result.text).toBe(content);
      expect(result.truncated).toBe(false);
    });

    it("应正确读取 .csv 文件", async () => {
      const content = "name,age\nAlice,30\nBob,25";
      vi.mocked(fs.readFile).mockResolvedValue(content as any);

      const result = await extractTextFromFile("data.csv");
      expect(result.text).toBe(content);
      expect(result.truncated).toBe(false);
    });

    // ─── DOCX ───────────────────────────────────────────────────────

    it("应正确读取 .docx 文件", async () => {
      const buffer = Buffer.from("fake docx content");
      vi.mocked(fs.readFile).mockResolvedValue(buffer as any);
      vi.mocked(mammoth.extractRawText).mockResolvedValue({
        value: "Extracted DOCX text",
        messages: [],
      });

      const result = await extractTextFromFile("report.docx");
      expect(result.text).toBe("Extracted DOCX text");
      expect(result.truncated).toBe(false);
      expect(mammoth.extractRawText).toHaveBeenCalledWith({ buffer });
    });

    // ─── PDF ────────────────────────────────────────────────────────

    it("应正确读取 .pdf 文件", async () => {
      const buffer = Buffer.from("fake pdf content");
      vi.mocked(fs.readFile).mockResolvedValue(buffer as any);
      mockGetText.mockResolvedValue({
        text: "Extracted PDF text",
        pages: [],
        total: 1,
      });

      const result = await extractTextFromFile("report.pdf");
      expect(result.text).toBe("Extracted PDF text");
      expect(result.truncated).toBe(false);
    });

    // ─── 截断逻辑 ───────────────────────────────────────────────────

    it("超长内容应被截断并标记 truncated", async () => {
      // Mock maxFileChars 为 100
      vi.mocked(getConfig).mockImplementation((key: string) => {
        if (key === "maxFileChars") return "100";
        if (key === "locale") return "zh-CN";
        return "";
      });

      const longContent = "Line 1\nLine 2\nLine 3\n" + "A".repeat(200);
      vi.mocked(fs.readFile).mockResolvedValue(longContent as any);

      const result = await extractTextFromFile("long.md");
      expect(result.truncated).toBe(true);
      expect(result.text.length).toBeLessThanOrEqual(100);
    });

    it("截断应尽量在换行符处断开", async () => {
      vi.mocked(getConfig).mockImplementation((key: string) => {
        if (key === "maxFileChars") return "50";
        if (key === "locale") return "zh-CN";
        return "";
      });

      // 构造一个在 45 字符处有换行符的文本
      const content =
        "A".repeat(42) + "\n" + "B".repeat(10) + "\n" + "C".repeat(50);
      vi.mocked(fs.readFile).mockResolvedValue(content as any);

      const result = await extractTextFromFile("test.md");
      expect(result.truncated).toBe(true);
      // 应在第一个换行符后截断（位置 42）
      expect(result.text).toBe("A".repeat(42));
    });

    // ─── 路径解析 ────────────────────────────────────────────────────

    it("应将相对路径 resolve 为绝对路径", async () => {
      const content = "test";
      vi.mocked(fs.readFile).mockResolvedValue(content as any);

      await extractTextFromFile("./relative/path.md");

      // stat 和 readFile 都应该收到 resolve 后的绝对路径
      const expectedPath = path.resolve("./relative/path.md");
      expect(fs.stat).toHaveBeenCalledWith(expectedPath);
    });
  });
});
