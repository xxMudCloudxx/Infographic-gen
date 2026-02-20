import path from 'node:path';
import { Command } from 'commander';
import { generateInfographicDSL, retryWithCorrection, MAX_RETRIES } from '../core/ai.js';
import { renderDSLToSVG, writeSVGFile, resolveOutputPath } from '../core/render.js';
import * as log from '../utils/logger.js';
import {
  startSpinner,
  succeedSpinner,
  failSpinner,
  updateSpinner,
} from '../utils/spinner.js';

/**
 * 注册 `generate` 子命令。
 *
 * 用法示例：
 *   infographic-gen generate "帮我画一个软件开发流程图" -o result.svg
 */
export function registerGenerateCommand(program: Command): void {
  program
    .command('generate')
    .alias('gen')
    .description('根据自然语言描述生成 SVG 信息图')
    .argument('<prompt>', '描述你想要生成的信息图内容')
    .option('-o, --output <path>', '输出 SVG 文件路径', 'infographic-output.svg')
    .action(async (prompt: string, opts: { output: string }) => {
      await handleGenerate(prompt, opts.output);
    });
}

/**
 * 生成命令的核心处理逻辑。
 *
 * 流程：
 * 1. 调用 LLM 生成 DSL
 * 2. 调用 SSR 渲染为 SVG
 * 3. 如果渲染失败，自动进入自我修正循环（最多 MAX_RETRIES 次）
 * 4. 写入 SVG 文件
 */
async function handleGenerate(prompt: string, outputOption: string): Promise<void> {
  const outputPath = resolveOutputPath(outputOption);

  log.info(`目标输出：${path.resolve(outputPath)}`);
  startSpinner('正在调用 AI 生成信息图语法...');

  let syntax: string;
  try {
    syntax = await generateInfographicDSL(prompt);
  } catch (err) {
    failSpinner('AI 调用失败');
    log.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  updateSpinner('正在渲染 SVG...');

  // ─── 渲染 + 自我修正循环 ───────────────────────────────────────────
  let svgContent: string | null = null;
  let lastError = '';

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      svgContent = await renderDSLToSVG(syntax);
      break; // 渲染成功，跳出循环
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);

      if (attempt < MAX_RETRIES) {
        // 还有重试机会 → 自我修正
        try {
          syntax = await retryWithCorrection(syntax, lastError, prompt, attempt + 1);
          updateSpinner('正在重新渲染 SVG...');
        } catch (retryErr) {
          failSpinner('自我修正失败');
          log.error(retryErr instanceof Error ? retryErr.message : String(retryErr));
          process.exit(1);
        }
      }
    }
  }

  if (!svgContent) {
    failSpinner('渲染最终失败');
    log.error(`经过 ${MAX_RETRIES} 次自我修正仍无法生成可渲染的信息图。`);
    log.error(`最后一次错误：${lastError}`);
    log.dim('生成的 DSL 语法如下（供 debug 参考）：');
    console.error(syntax);
    process.exit(1);
  }

  // ─── 渲染成功，写入文件 ─────────────────────────────────────────────
  try {
    await writeSVGFile(outputPath, svgContent);
  } catch (err) {
    failSpinner('文件写入失败');
    log.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  succeedSpinner(`信息图已生成！`);
  log.success(`SVG 已保存至：${path.resolve(outputPath)}`);
  log.dim('可直接在浏览器中打开 SVG 文件查看效果。');
}
