import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// spinner 模块使用 ora，需要 mock 来避免真实终端 spinner
const mockStart = vi.fn().mockReturnThis();
const mockSucceed = vi.fn();
const mockFail = vi.fn();
const mockStop = vi.fn();

const mockSpinnerInstance = {
  start: mockStart,
  succeed: mockSucceed,
  fail: mockFail,
  stop: mockStop,
  isSpinning: false,
  text: "",
};

vi.mock("ora", () => ({
  default: vi.fn(() => ({
    ...mockSpinnerInstance,
    start: vi.fn(() => {
      mockSpinnerInstance.isSpinning = true;
      return mockSpinnerInstance;
    }),
  })),
}));

// 必须在 mock 声明之后动态 import
const spinnerModule = await import("../../src/utils/spinner.js");

describe("utils/spinner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSpinnerInstance.isSpinning = false;
    mockSpinnerInstance.text = "";
  });

  describe("startSpinner()", () => {
    it("应启动一个新的 spinner", () => {
      const spinner = spinnerModule.startSpinner("加载中...");
      expect(spinner).toBeDefined();
    });

    it("返回的 spinner 应标记为 isSpinning", () => {
      const spinner = spinnerModule.startSpinner("处理中...");
      expect(spinner.isSpinning).toBe(true);
    });
  });

  describe("succeedSpinner()", () => {
    it("调用 succeed 后不应报错", () => {
      spinnerModule.startSpinner("测试");
      expect(() => spinnerModule.succeedSpinner("完成")).not.toThrow();
    });

    it("没有活跃 spinner 时也不应报错", () => {
      expect(() => spinnerModule.succeedSpinner("完成")).not.toThrow();
    });
  });

  describe("failSpinner()", () => {
    it("调用 fail 后不应报错", () => {
      spinnerModule.startSpinner("测试");
      expect(() => spinnerModule.failSpinner("失败")).not.toThrow();
    });

    it("没有活跃 spinner 时也不应报错", () => {
      expect(() => spinnerModule.failSpinner("失败")).not.toThrow();
    });
  });

  describe("updateSpinner()", () => {
    it("更新文本不应报错", () => {
      spinnerModule.startSpinner("初始文本");
      expect(() => spinnerModule.updateSpinner("新文本")).not.toThrow();
    });

    it("没有活跃 spinner 时也不应报错", () => {
      expect(() => spinnerModule.updateSpinner("新文本")).not.toThrow();
    });
  });

  describe("stopSpinner()", () => {
    it("停止后不应报错", () => {
      spinnerModule.startSpinner("测试");
      expect(() => spinnerModule.stopSpinner()).not.toThrow();
    });

    it("没有活跃 spinner 时也不应报错", () => {
      expect(() => spinnerModule.stopSpinner()).not.toThrow();
    });
  });
});
