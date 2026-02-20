import { Command } from "commander";
import {
  getAllConfig,
  getConfig,
  setConfig,
  deleteConfig,
  isValidConfigKey,
  getConfigPath,
  CONFIG_KEYS,
  CONFIG_LABELS,
  type ConfigKey,
} from "../config/index.js";
import * as log from "../utils/logger.js";

/**
 * 注册 `config` 子命令，支持以下操作：
 *   config set <key> <value>  — 设置配置项
 *   config get <key>          — 查看单个配置项
 *   config list               — 列出所有配置
 *   config delete <key>       — 删除（重置）配置项
 *   config path               — 打印配置文件路径
 */
export function registerConfigCommand(program: Command): void {
  const configCmd = program
    .command("config")
    .description("管理 LLM 配置（API Key、Base URL、Provider、Model）");

  // ---------- config set ----------
  configCmd
    .command("set <key> <value>")
    .description("设置配置项")
    .action((key: string, value: string) => {
      if (!isValidConfigKey(key)) {
        log.error(`无效的配置项 "${key}"，可选项：${CONFIG_KEYS.join(", ")}`);
        process.exit(1);
      }
      setConfig(key, value);
      log.success(`${CONFIG_LABELS[key]} 已设置`);
    });

  // ---------- config get ----------
  configCmd
    .command("get <key>")
    .description("查看单个配置项")
    .action((key: string) => {
      if (!isValidConfigKey(key)) {
        log.error(`无效的配置项 "${key}"，可选项：${CONFIG_KEYS.join(", ")}`);
        process.exit(1);
      }
      const val = getConfig(key);
      if (!val) {
        log.warn(`${CONFIG_LABELS[key]} 尚未设置`);
      } else {
        // 对 apiKey 做脱敏显示
        const display = key === "apiKey" ? maskApiKey(val) : val;
        log.label(CONFIG_LABELS[key], display);
      }
    });

  // ---------- config list ----------
  configCmd
    .command("list")
    .description("列出所有配置项")
    .action(() => {
      const all = getAllConfig();
      log.info("当前配置：");
      for (const k of CONFIG_KEYS) {
        const val = all[k];
        const display =
          k === "apiKey" && val ? maskApiKey(val) : val || "(未设置)";
        log.label(CONFIG_LABELS[k], display);
      }
      log.dim(`  配置文件位置: ${getConfigPath()}`);
    });

  // ---------- config delete ----------
  configCmd
    .command("delete <key>")
    .description("删除配置项（恢复默认值）")
    .action((key: string) => {
      if (!isValidConfigKey(key)) {
        log.error(`无效的配置项 "${key}"，可选项：${CONFIG_KEYS.join(", ")}`);
        process.exit(1);
      }
      deleteConfig(key as ConfigKey);
      log.success(`${CONFIG_LABELS[key as ConfigKey]} 已重置为默认值`);
    });

  // ---------- config path ----------
  configCmd
    .command("path")
    .description("显示配置文件路径")
    .action(() => {
      console.log(getConfigPath());
    });
}

// ---- helpers ----

/** 对 API Key 做脱敏处理：只显示前 4 位和后 4 位 */
function maskApiKey(key: string): string {
  if (key.length <= 8) return "****";
  return key.slice(0, 4) + "****" + key.slice(-4);
}
