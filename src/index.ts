import { Command } from "commander";
import { registerConfigCommand } from "./commands/config.js";
import { registerGenerateCommand } from "./commands/generate.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { t } from "./utils/i18n.js";

// 从 package.json 中读取版本号
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, "../package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
const VERSION = packageJson.version;

const program = new Command();

program
  .name("infographic-gen")
  .description(t("programDesc"))
  .version(VERSION, "-v, --version", t("versionFlag"));

// 注册子命令
registerConfigCommand(program);
registerGenerateCommand(program);

// 解析命令行参数
program.parse(process.argv);
