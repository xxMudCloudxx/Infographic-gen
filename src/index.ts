import { Command } from "commander";
import { registerConfigCommand } from "./commands/config.js";
import { registerGenerateCommand } from "./commands/generate.js";

const VERSION = "1.0.0";

const program = new Command();

program
  .name("infographic-gen")
  .description("AI 驱动的信息图生成 CLI —— 输入自然语言，输出精美 SVG 信息图")
  .version(VERSION, "-v, --version", "显示版本号");

// 注册子命令
registerConfigCommand(program);
registerGenerateCommand(program);

// 解析命令行参数
program.parse(process.argv);
