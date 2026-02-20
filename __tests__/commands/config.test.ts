import { describe, it, expect, vi, beforeEach } from "vitest";
import { Command } from "commander";
import { registerConfigCommand } from "../../src/commands/config.js";

// Mock config module
vi.mock("../../src/config/index.js", () => {
  const store: Record<string, string> = {
    apiKey: "",
    baseUrl: "https://api.openai.com/v1",
    provider: "openai",
    modelName: "gpt-4o",
  };

  const DEFAULTS: Record<string, string> = {
    apiKey: "",
    baseUrl: "https://api.openai.com/v1",
    provider: "openai",
    modelName: "gpt-4o",
  };

  return {
    CONFIG_KEYS: ["apiKey", "baseUrl", "provider", "modelName"] as const,
    CONFIG_LABELS: {
      apiKey: "API Key",
      baseUrl: "Base URL",
      provider: "Provider",
      modelName: "Model Name",
    },
    getConfig: vi.fn((key: string) => store[key] ?? ""),
    setConfig: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    deleteConfig: vi.fn((key: string) => {
      store[key] = DEFAULTS[key] ?? "";
    }),
    getAllConfig: vi.fn(() => ({ ...store })),
    isValidConfigKey: vi.fn((key: string) =>
      ["apiKey", "baseUrl", "provider", "modelName"].includes(key),
    ),
    getConfigPath: vi.fn(() => "/mock/path/config.json"),
    getLLMConfig: vi.fn(() => ({ ...store })),
  };
});

// Mock logger
vi.mock("../../src/utils/logger.js", () => ({
  info: vi.fn(),
  success: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  dim: vi.fn(),
  bold: vi.fn((s: string) => s),
  label: vi.fn(),
}));

import { setConfig, getConfig } from "../../src/config/index.js";
import * as log from "../../src/utils/logger.js";

describe("commands/config", () => {
  let program: Command;
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    program = new Command();
    program.exitOverride(); // 阻止 commander 调用 process.exit
    registerConfigCommand(program);

    // Mock process.exit 以便捕获退出码而非真正退出
    exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("process.exit called");
    }) as never);

    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  describe("config set", () => {
    it("应成功设置合法的配置项", async () => {
      await program.parseAsync([
        "node",
        "test",
        "config",
        "set",
        "apiKey",
        "sk-test123",
      ]);
      expect(setConfig).toHaveBeenCalledWith("apiKey", "sk-test123");
      expect(log.success).toHaveBeenCalled();
    });

    it("应成功设置 baseUrl", async () => {
      await program.parseAsync([
        "node",
        "test",
        "config",
        "set",
        "baseUrl",
        "https://api.deepseek.com/v1",
      ]);
      expect(setConfig).toHaveBeenCalledWith(
        "baseUrl",
        "https://api.deepseek.com/v1",
      );
    });

    it("对非法 key 应报错并退出", async () => {
      await expect(
        program.parseAsync([
          "node",
          "test",
          "config",
          "set",
          "invalidKey",
          "value",
        ]),
      ).rejects.toThrow();
      expect(log.error).toHaveBeenCalled();
    });
  });

  describe("config get", () => {
    it("应成功获取已设置的配置项", async () => {
      vi.mocked(getConfig).mockReturnValue("test-value");
      await program.parseAsync(["node", "test", "config", "get", "baseUrl"]);
      expect(getConfig).toHaveBeenCalledWith("baseUrl");
      expect(log.label).toHaveBeenCalled();
    });

    it("配置项为空时应输出警告", async () => {
      vi.mocked(getConfig).mockReturnValue("");
      await program.parseAsync(["node", "test", "config", "get", "apiKey"]);
      expect(log.warn).toHaveBeenCalled();
    });

    it("对非法 key 应报错并退出", async () => {
      await expect(
        program.parseAsync(["node", "test", "config", "get", "badKey"]),
      ).rejects.toThrow();
      expect(log.error).toHaveBeenCalled();
    });
  });

  describe("config list", () => {
    it("应列出所有配置项", async () => {
      await program.parseAsync(["node", "test", "config", "list"]);
      expect(log.info).toHaveBeenCalled();
      // 应多次调用 label（每个配置项一次）
      expect(vi.mocked(log.label).mock.calls.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe("config delete", () => {
    it("应成功删除合法的配置项", async () => {
      const { deleteConfig } = await import("../../src/config/index.js");
      await program.parseAsync([
        "node",
        "test",
        "config",
        "delete",
        "modelName",
      ]);
      expect(deleteConfig).toHaveBeenCalledWith("modelName");
      expect(log.success).toHaveBeenCalled();
    });

    it("对非法 key 应报错并退出", async () => {
      await expect(
        program.parseAsync(["node", "test", "config", "delete", "bad"]),
      ).rejects.toThrow();
      expect(log.error).toHaveBeenCalled();
    });
  });

  describe("config path", () => {
    it("应输出配置文件路径", async () => {
      await program.parseAsync(["node", "test", "config", "path"]);
      expect(consoleSpy).toHaveBeenCalledWith("/mock/path/config.json");
    });
  });
});
