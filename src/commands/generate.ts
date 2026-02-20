import path from "node:path";
import fs from "node:fs/promises";
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
import { extractTextFromFile } from "../utils/file-reader.js";
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
 *   infographic-gen generate --from-dsl my-syntax.txt -o result.svg
 */
export function registerGenerateCommand(program: Command): void {
  program
    .command("generate", { isDefault: true })
    .alias("g")
    .description(t("generateDesc"))
    .argument("[prompt]", t("generatePromptArg"))
    .option("-o, --output <path>", t("generateOutputOpt"))
    .option("--dsl <path>", t("generateDslOpt"))
    .option("-f, --file <path>", t("generateFileOpt"))
    .option("--from-dsl <path>", t("generateFromDslOpt"))
    .action(
      async (
        prompt: string | undefined,
        opts: {
          output?: string;
          dsl?: string;
          file?: string;
          fromDsl?: string;
        },
      ) => {
        // --from-dsl 模式：直接从 DSL 文件渲染，不需要 prompt
        if (opts.fromDsl) {
          await handleFromDsl(opts.fromDsl, opts.output);
          return;
        }

        // 正常模式：必须提供 prompt
        if (!prompt) {
          log.error(t("generatePromptArg"));
          process.exit(1);
        }

        await handleGenerate(prompt, opts.output, opts.dsl, opts.file);
      },
    );
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
  fileOption?: string,
): Promise<void> {
  const outputPath = resolveOutputPath(outputOption);

  // ─── 文件解析（可选）─────────────────────────────────────────
  let fileContext: string | undefined;

  if (fileOption) {
    startSpinner(t("parsingFile", { path: fileOption }));
    try {
      const { text, truncated } = await extractTextFromFile(fileOption);
      fileContext = text;
      succeedSpinner(t("fileParsed"));
      if (truncated) {
        log.warn(t("fileContentTruncated"));
      }
    } catch (err) {
      failSpinner(t("aiCallFailed"));
      log.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  }

  log.info(t("outputTarget", { path: path.resolve(outputPath) }));
  startSpinner(t("callingAI"));

  let syntax: string;
  try {
    syntax = await generateInfographicDSL(prompt, fileContext);
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
            fileContext,
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

/**
 * 从 DSL 文件直接渲染 SVG 的处理逻辑。
 *
 * 跳过 AI 生成步骤，直接读取 DSL 文件并渲染。
 * 适用于：
 * - 之前通过 --dsl 保存的 DSL 语法文件
 * - 手动编写或微调过的 DSL 文件
 * - error-dump.txt 修正后重新渲染
 */
async function handleFromDsl(
  dslPath: string,
  outputOption?: string,
): Promise<void> {
  const outputPath = resolveOutputPath(outputOption);
  const resolvedDslPath = path.resolve(dslPath);

  log.dim(t("fromDslNoPromptNeeded"));
  log.info(t("outputTarget", { path: path.resolve(outputPath) }));

  // ─── 读取 DSL 文件 ──────────────────────────────────────────────
  startSpinner(t("readingDslFile", { path: dslPath }));

  let syntax: string;
  try {
    syntax = await fs.readFile(resolvedDslPath, "utf-8");
  } catch {
    failSpinner(t("dslFileReadFailed"));
    log.error(t("dslFileNotFound", { path: resolvedDslPath }));
    process.exit(1);
  }

  syntax = syntax.trim();
  if (!syntax) {
    failSpinner(t("dslFileReadFailed"));
    log.error(t("llmEmptyContent"));
    process.exit(1);
  }

  succeedSpinner(t("dslFileReadSuccess"));

  // ─── 渲染 SVG ──────────────────────────────────────────────────
  startSpinner(t("renderingSVG"));

  let svgContent: string;
  try {
    svgContent = await renderDSLToSVG(syntax);
  } catch (err) {
    failSpinner(t("renderingFailed"));
    log.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  // ─── 写入文件 ──────────────────────────────────────────────────
  try {
    await writeSVGFile(outputPath, svgContent);
  } catch (err) {
    failSpinner(t("fileWriteFailed"));
    log.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  succeedSpinner(t("infographicGenerated"));
  log.success(t("svgSaved", { path: path.resolve(outputPath) }));
  log.dim(t("openInBrowser"));
}
