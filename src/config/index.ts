import Conf from "conf";

/**
 * 用户可配置的 LLM 字段
 */
export interface LLMConfig {
  apiKey: string;
  baseUrl: string;
  provider: string;
  modelName: string;
}

/**
 * 配置 schema 的完整类型
 */
interface ConfigSchema {
  apiKey: string;
  baseUrl: string;
  provider: string;
  modelName: string;
}

/** 所有可配置的 key */
export const CONFIG_KEYS = [
  "apiKey",
  "baseUrl",
  "provider",
  "modelName",
] as const;
export type ConfigKey = (typeof CONFIG_KEYS)[number];

/** 配置项的人类可读标签 */
export const CONFIG_LABELS: Record<ConfigKey, string> = {
  apiKey: "API Key",
  baseUrl: "Base URL",
  provider: "Provider",
  modelName: "Model Name",
};

/** 默认值 */
const DEFAULTS: ConfigSchema = {
  apiKey: "",
  baseUrl: "https://api.openai.com/v1",
  provider: "openai",
  modelName: "gpt-4o",
};

/**
 * 基于 conf 的本地持久化配置管理器（单例）
 */
const store = new Conf<ConfigSchema>({
  projectName: "infographic-gen",
  defaults: DEFAULTS,
});

/** 读取单个配置值 */
export function getConfig<K extends ConfigKey>(key: K): string {
  return store.get(key) as string;
}

/** 写入单个配置值 */
export function setConfig<K extends ConfigKey>(key: K, value: string): void {
  store.set(key, value);
}

/** 删除单个配置值（恢复为默认） */
export function deleteConfig<K extends ConfigKey>(key: K): void {
  store.delete(key);
}

/** 读取完整 LLM 配置（用于创建 OpenAI 客户端） */
export function getLLMConfig(): LLMConfig {
  return {
    apiKey: getConfig("apiKey"),
    baseUrl: getConfig("baseUrl"),
    provider: getConfig("provider"),
    modelName: getConfig("modelName"),
  };
}

/** 返回所有配置项的 KV 对象（用于 `config list`） */
export function getAllConfig(): Record<ConfigKey, string> {
  return {
    apiKey: getConfig("apiKey"),
    baseUrl: getConfig("baseUrl"),
    provider: getConfig("provider"),
    modelName: getConfig("modelName"),
  };
}

/** 判断某个 key 是否为合法配置项 */
export function isValidConfigKey(key: string): key is ConfigKey {
  return CONFIG_KEYS.includes(key as ConfigKey);
}

/** 返回配置文件在磁盘上的路径（用于 debug） */
export function getConfigPath(): string {
  return store.path;
}
