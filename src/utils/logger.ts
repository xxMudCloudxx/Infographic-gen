import pc from "picocolors";

/**
 * 统一的控制台日志工具，基于 picocolors 着色。
 * 所有输出走 stderr，stdout 留给管道场景。
 */

export function info(msg: string): void {
  console.error(pc.blue("ℹ") + " " + msg);
}

export function success(msg: string): void {
  console.error(pc.green("✔") + " " + msg);
}

export function warn(msg: string): void {
  console.error(pc.yellow("⚠") + " " + pc.yellow(msg));
}

export function error(msg: string): void {
  console.error(pc.red("✖") + " " + pc.red(msg));
}

export function dim(msg: string): void {
  console.error(pc.dim(msg));
}

export function bold(msg: string): string {
  return pc.bold(msg);
}

export function label(key: string, value: string): void {
  console.error(`  ${pc.cyan(key)}: ${value}`);
}
