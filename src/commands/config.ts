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
import { t } from "../utils/i18n.js";

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
    .alias("c")
    .description(
      "Manage configuration (API Key, Base URL, Provider, Model, Output Directory)",
    );

  // ---------- config set ----------
  configCmd
    .command("set <key> <value>")
    .description(t("configSetDesc"))
    .action((key: string, value: string) => {
      if (!isValidConfigKey(key)) {
        log.error(t("configInvalidKey", { key, keys: CONFIG_KEYS.join(", ") }));
        process.exit(1);
      }
      setConfig(key, value);
      log.success(t("configSetSuccess", { label: CONFIG_LABELS[key] }));
    });

  // ---------- config get ----------
  configCmd
    .command("get <key>")
    .description(t("configGetDesc"))
    .action((key: string) => {
      if (!isValidConfigKey(key)) {
        log.error(t("configInvalidKey", { key, keys: CONFIG_KEYS.join(", ") }));
        process.exit(1);
      }
      const val = getConfig(key);
      if (!val) {
        log.warn(t("configNotSet", { label: CONFIG_LABELS[key] }));
      } else {
        // Mask apiKey for security
        const display = key === "apiKey" ? maskApiKey(val) : val;
        log.label(CONFIG_LABELS[key], display);
      }
    });

  // ---------- config list ----------
  configCmd
    .command("list")
    .description(t("configListDesc"))
    .action(() => {
      const all = getAllConfig();
      log.info(t("configCurrent"));
      for (const k of CONFIG_KEYS) {
        const val = all[k];
        const display =
          k === "apiKey" && val
            ? maskApiKey(val)
            : val || t("configNotSetValue");
        log.label(CONFIG_LABELS[k], display);
      }
      log.dim(t("configFileLocation", { path: getConfigPath() }));
    });

  // ---------- config delete ----------
  configCmd
    .command("delete <key>")
    .description(t("configDeleteDesc"))
    .action((key: string) => {
      if (!isValidConfigKey(key)) {
        log.error(t("configInvalidKey", { key, keys: CONFIG_KEYS.join(", ") }));
        process.exit(1);
      }
      deleteConfig(key as ConfigKey);
      log.success(
        t("configResetSuccess", { label: CONFIG_LABELS[key as ConfigKey] }),
      );
    });

  // ---------- config path ----------
  configCmd
    .command("path")
    .description(t("configPathDesc"))
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
