import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as logger from "../../src/utils/logger.js";

describe("utils/logger", () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderrSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    stderrSpy.mockRestore();
  });

  describe("info()", () => {
    it("应输出到 stderr", () => {
      logger.info("测试信息");
      expect(stderrSpy).toHaveBeenCalledTimes(1);
    });

    it("输出应包含原始消息文本", () => {
      logger.info("hello world");
      const output = stderrSpy.mock.calls[0][0] as string;
      expect(output).toContain("hello world");
    });

    it("输出应包含 info 图标 ℹ", () => {
      logger.info("test");
      const output = stderrSpy.mock.calls[0][0] as string;
      expect(output).toContain("ℹ");
    });
  });

  describe("success()", () => {
    it("应输出到 stderr", () => {
      logger.success("操作成功");
      expect(stderrSpy).toHaveBeenCalledTimes(1);
    });

    it("输出应包含原始消息文本", () => {
      logger.success("all done");
      const output = stderrSpy.mock.calls[0][0] as string;
      expect(output).toContain("all done");
    });

    it("输出应包含成功图标 ✔", () => {
      logger.success("test");
      const output = stderrSpy.mock.calls[0][0] as string;
      expect(output).toContain("✔");
    });
  });

  describe("warn()", () => {
    it("应输出到 stderr", () => {
      logger.warn("注意");
      expect(stderrSpy).toHaveBeenCalledTimes(1);
    });

    it("输出应包含原始消息文本", () => {
      logger.warn("careful here");
      const output = stderrSpy.mock.calls[0][0] as string;
      expect(output).toContain("careful here");
    });

    it("输出应包含警告图标 ⚠", () => {
      logger.warn("test");
      const output = stderrSpy.mock.calls[0][0] as string;
      expect(output).toContain("⚠");
    });
  });

  describe("error()", () => {
    it("应输出到 stderr", () => {
      logger.error("出错了");
      expect(stderrSpy).toHaveBeenCalledTimes(1);
    });

    it("输出应包含原始消息文本", () => {
      logger.error("something failed");
      const output = stderrSpy.mock.calls[0][0] as string;
      expect(output).toContain("something failed");
    });

    it("输出应包含错误图标 ✖", () => {
      logger.error("test");
      const output = stderrSpy.mock.calls[0][0] as string;
      expect(output).toContain("✖");
    });
  });

  describe("dim()", () => {
    it("应输出到 stderr", () => {
      logger.dim("灰色文字");
      expect(stderrSpy).toHaveBeenCalledTimes(1);
    });

    it("输出应包含原始消息文本", () => {
      logger.dim("muted text");
      const output = stderrSpy.mock.calls[0][0] as string;
      expect(output).toContain("muted text");
    });
  });

  describe("bold()", () => {
    it("应返回字符串", () => {
      const result = logger.bold("粗体");
      expect(typeof result).toBe("string");
    });

    it("返回值应包含原始文本", () => {
      const result = logger.bold("important");
      expect(result).toContain("important");
    });
  });

  describe("label()", () => {
    it("应输出到 stderr", () => {
      logger.label("Key", "Value");
      expect(stderrSpy).toHaveBeenCalledTimes(1);
    });

    it("输出应包含 key 和 value", () => {
      logger.label("API Key", "sk-xxxx");
      const output = stderrSpy.mock.calls[0][0] as string;
      expect(output).toContain("API Key");
      expect(output).toContain("sk-xxxx");
    });
  });
});
