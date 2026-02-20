import path from "node:path";
import { Command } from "commander";
import {
  generateInfographicDSL,
  retryWithCorrection,
  MAX_RETRIES,
} from "../core/ai.js";
import {
  renderDSLToSVG,
  writeSVGFile,
  writeDSLFile,
  resolveOutputPath,
} from "../core/render.js";
import * as log from "../utils/logger.js";
import {
  startSpinner,
  succeedSpinner,
  failSpinner,
  updateSpinner,
} from "../utils/spinner.js";
import { t } from "../utils/i18n.js";

/**
 * 注册 `generate` 子命令。
 *
 * 用法示例：
 *   infographic-gen generate "帮我画一个软件开发流程图" -o result.svg
 *   infographic-gen generate "帮我画一个饼图" -o chart.svg --dsl chart-syntax.txt
 */
export function registerGenerateCommand(program: Command): void {
  program
    .command("generate", { isDefault: true })
    .alias("g")
    .description(t("generateDesc"))
    .argument("<prompt>", t("generatePromptArg"))
    .option("-o, --output <path>", t("generateOutputOpt"))
    .option("--dsl <path>", t("generateDslOpt"))
    .action(async (prompt: string, opts: { output?: string; dsl?: string }) => {
      await handleGenerate(prompt, opts.output, opts.dsl);
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
 * 5. 如果用户指定了 --dsl，保存原始 DSL 语法
 */
async function handleGenerate(
  prompt: string,
  outputOption?: string,
  dslOption?: string,
): Promise<void> {
  const outputPath = resolveOutputPath(outputOption);

  log.info(t("outputTarget", { path: path.resolve(outputPath) }));
  startSpinner(t("callingAI"));

  let syntax: string;
  try {
    syntax = await generateInfographicDSL(prompt);
  } catch (err) {
    failSpinner(t("aiCallFailed"));
    log.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  updateSpinner(t("renderingSVG"));

  // ─── 渲染 + 自我修正循环 ───────────────────────────────────────────
  let svgContent: string | null = null;
  let lastError = "";

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      svgContent = await renderDSLToSVG(syntax);
      break; // Render successful, exit loop
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);

      if (attempt < MAX_RETRIES) {
        // Retry available → self-correction
        try {
          syntax = await retryWithCorrection(
            syntax,
            lastError,
            prompt,
            attempt + 1,
          );
          updateSpinner(t("reRenderingSVG"));
        } catch (retryErr) {
          failSpinner(t("selfCorrectionFailed"));
          log.error(
            retryErr instanceof Error ? retryErr.message : String(retryErr),
          );
          process.exit(1);
        }
      }
    }
  }

  if (!svgContent) {
    failSpinner(t("renderingFailed"));
    log.error(t("renderFailedAfterRetries", { retries: String(MAX_RETRIES) }));
    log.error(t("lastError", { error: lastError }));

    // Auto-save problematic DSL to error-dump.txt
    const errorDumpPath = "error-dump.txt";
    try {
      await writeDSLFile(errorDumpPath, syntax);
      log.warn(t("dslAutoSaved", { path: path.resolve(errorDumpPath) }));
      log.dim(t("dslAutoSaveHint"));
    } catch (writeErr) {
      log.dim(t("dslForDebug"));
      console.error(syntax);
    }

    process.exit(1);
  }

  // ─── Render successful, write file ─────────────────────────────────────────────
  try {
    await writeSVGFile(outputPath, svgContent);
  } catch (err) {
    failSpinner(t("fileWriteFailed"));
    log.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  // ─── If user specified --dsl, save raw DSL syntax ───────────────────────
  if (dslOption) {
    try {
      await writeDSLFile(dslOption, syntax);
      log.success(t("dslSaved", { path: path.resolve(dslOption) }));
    } catch (err) {
      log.warn(t("dslWriteFailed"));
      log.warn(err instanceof Error ? err.message : String(err));
    }
  }

  succeedSpinner(t("infographicGenerated"));
  log.success(t("svgSaved", { path: path.resolve(outputPath) }));
  log.dim(t("openInBrowser"));
}
