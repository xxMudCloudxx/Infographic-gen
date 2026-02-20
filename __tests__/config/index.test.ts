import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getConfig,
  setConfig,
  deleteConfig,
  getAllConfig,
  getLLMConfig,
  isValidConfigKey,
  getConfigPath,
  CONFIG_KEYS,
  CONFIG_LABELS,
} from "../../src/config/index.js";

describe("config/index", () => {
  // 保存测试前的原始值，测试后恢复
  let originals: Record<string, string>;

  beforeEach(() => {
    originals = { ...getAllConfig() };
  });

  afterEach(() => {
    // 恢复原始配置
    for (const key of CONFIG_KEYS) {
      if (originals[key]) {
        setConfig(key, originals[key]);
      } else {
        deleteConfig(key);
      }
    }
  });

  describe("CONFIG_KEYS 常量", () => {
    it("应包含 4 个配置项", () => {
      expect(CONFIG_KEYS).toHaveLength(4);
    });

    it("应包含 apiKey, baseUrl, provider, modelName", () => {
      expect(CONFIG_KEYS).toContain("apiKey");
      expect(CONFIG_KEYS).toContain("baseUrl");
      expect(CONFIG_KEYS).toContain("provider");
      expect(CONFIG_KEYS).toContain("modelName");
    });
  });

  describe("CONFIG_LABELS", () => {
    it("每个 key 都应有对应的人类可读标签", () => {
      for (const key of CONFIG_KEYS) {
        expect(CONFIG_LABELS[key]).toBeDefined();
        expect(typeof CONFIG_LABELS[key]).toBe("string");
        expect(CONFIG_LABELS[key].length).toBeGreaterThan(0);
      }
    });
  });

  describe("isValidConfigKey()", () => {
    it("对合法 key 返回 true", () => {
      expect(isValidConfigKey("apiKey")).toBe(true);
      expect(isValidConfigKey("baseUrl")).toBe(true);
      expect(isValidConfigKey("provider")).toBe(true);
      expect(isValidConfigKey("modelName")).toBe(true);
    });

    it("对非法 key 返回 false", () => {
      expect(isValidConfigKey("invalidKey")).toBe(false);
      expect(isValidConfigKey("")).toBe(false);
      expect(isValidConfigKey("API_KEY")).toBe(false);
      expect(isValidConfigKey("api_key")).toBe(false);
    });
  });

  describe("setConfig() / getConfig()", () => {
    it("能正确存储和读取 apiKey", () => {
      setConfig("apiKey", "test-key-123");
      expect(getConfig("apiKey")).toBe("test-key-123");
    });

    it("能正确存储和读取 baseUrl", () => {
      setConfig("baseUrl", "https://api.test.com/v1");
      expect(getConfig("baseUrl")).toBe("https://api.test.com/v1");
    });

    it("能正确存储和读取 provider", () => {
      setConfig("provider", "deepseek");
      expect(getConfig("provider")).toBe("deepseek");
    });

    it("能正确存储和读取 modelName", () => {
      setConfig("modelName", "gpt-4o-mini");
      expect(getConfig("modelName")).toBe("gpt-4o-mini");
    });

    it("覆盖写入应生效", () => {
      setConfig("apiKey", "first-value");
      setConfig("apiKey", "second-value");
      expect(getConfig("apiKey")).toBe("second-value");
    });
  });

  describe("deleteConfig()", () => {
    it("删除后值应不再是自定义值", () => {
      setConfig("baseUrl", "https://custom.api.com");
      deleteConfig("baseUrl");
      // conf 的 delete 会移除 key，后续 get 返回 defaults 中的值或 undefined
      const val = getConfig("baseUrl");
      expect(val).not.toBe("https://custom.api.com");
    });

    it("删除 modelName 后不再返回自定义值", () => {
      setConfig("modelName", "custom-model");
      deleteConfig("modelName");
      const val = getConfig("modelName");
      expect(val).not.toBe("custom-model");
    });

    it("删除不存在的 key 不应报错", () => {
      expect(() => deleteConfig("apiKey")).not.toThrow();
    });
  });

  describe("getLLMConfig()", () => {
    it("应返回包含所有 4 个字段的对象", () => {
      const config = getLLMConfig();
      expect(config).toHaveProperty("apiKey");
      expect(config).toHaveProperty("baseUrl");
      expect(config).toHaveProperty("provider");
      expect(config).toHaveProperty("modelName");
    });

    it("返回的值应与 getConfig 一致", () => {
      setConfig("apiKey", "llm-key");
      setConfig("baseUrl", "https://llm.api.com");
      const config = getLLMConfig();
      expect(config.apiKey).toBe("llm-key");
      expect(config.baseUrl).toBe("https://llm.api.com");
    });
  });

  describe("getAllConfig()", () => {
    it("应返回所有配置项的键值对", () => {
      setConfig("apiKey", "all-test-key");
      setConfig("provider", "azure");
      const all = getAllConfig();
      expect(all.apiKey).toBe("all-test-key");
      expect(all.provider).toBe("azure");
      expect(Object.keys(all)).toHaveLength(4);
    });
  });

  describe("getConfigPath()", () => {
    it("应返回非空的文件路径字符串", () => {
      const p = getConfigPath();
      expect(typeof p).toBe("string");
      expect(p.length).toBeGreaterThan(0);
    });

    it("路径应包含 infographic-gen 标识", () => {
      const p = getConfigPath();
      expect(p.toLowerCase()).toContain("infographic-gen");
    });

    it("路径应以 .json 结尾", () => {
      const p = getConfigPath();
      expect(p).toMatch(/\.json$/);
    });
  });
});
