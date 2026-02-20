import ora, { type Ora } from "ora";

/**
 * 终端 Loading 动画封装。
 * 提供 start / succeed / fail / update 等便捷方法。
 */

let currentSpinner: Ora | null = null;

export function startSpinner(text: string): Ora {
  // 如果之前有未关闭的 spinner，先停掉
  if (currentSpinner?.isSpinning) {
    currentSpinner.stop();
  }
  currentSpinner = ora({ text, stream: process.stderr }).start();
  return currentSpinner;
}

export function succeedSpinner(text?: string): void {
  currentSpinner?.succeed(text);
  currentSpinner = null;
}

export function failSpinner(text?: string): void {
  currentSpinner?.fail(text);
  currentSpinner = null;
}

export function updateSpinner(text: string): void {
  if (currentSpinner) {
    currentSpinner.text = text;
  }
}

export function stopSpinner(): void {
  currentSpinner?.stop();
  currentSpinner = null;
}
