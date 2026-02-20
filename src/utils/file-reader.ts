import fs from "node:fs/promises";
import path from "node:path";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { t } from "./i18n.js";
import { getConfig } from "../config/index.js";

/** 默认最大文件大小：10MB */
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024;

/** 默认最大文本字符数：30000 */
const DEFAULT_MAX_FILE_CHARS = 30000;

/** 支持的文件扩展名 */
const SUPPORTED_EXTENSIONS = [".md", ".txt", ".json", ".csv", ".docx", ".pdf"];

/**
 * 按段落边界截断文本，保留结构完整性。
 */
function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;

  const truncated = text.slice(0, maxChars);
  // 退到最后一个换行符，避免截断在句子中间
  const lastNewline = truncated.lastIndexOf("\n");
  return lastNewline > maxChars * 0.8
    ? truncated.slice(0, lastNewline)
    : truncated;
}

/**
 * 根据文件后缀，智能提取文件中的纯文本。
 *
 * - 不调用 process.exit()，仅抛出异常，由上层处理。
 * - 自动检查文件大小，防止 DoS。
 * - 自动截断超长文本，返回 { text, truncated } 。
 *
 * @param filePath 文件路径（支持相对路径，内部会 resolve）
 * @returns 提取的纯文本和是否被截断的标志
 */
export async function extractTextFromFile(
  filePath: string,
): Promise<{ text: string; truncated: boolean }> {
  const resolvedPath = path.resolve(filePath);
  const ext = path.extname(resolvedPath).toLowerCase();

  // 1. 检查扩展名是否支持
  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    throw new Error(
      t("unsupportedFileFormat", {
        ext,
        supported: SUPPORTED_EXTENSIONS.join(", "),
      }),
    );
  }

  // 2. 检查文件是否存在 & 大小预检
  let stats: Awaited<ReturnType<typeof fs.stat>>;
  try {
    stats = await fs.stat(resolvedPath);
  } catch {
    throw new Error(t("fileNotFound", { path: resolvedPath }));
  }

  if (stats.size > DEFAULT_MAX_FILE_SIZE) {
    throw new Error(
      t("fileTooLarge", {
        size: (stats.size / 1024 / 1024).toFixed(1),
      }),
    );
  }

  // 3. 根据扩展名提取文本
  let rawText: string;

  if (ext === ".md" || ext === ".txt" || ext === ".json" || ext === ".csv") {
    rawText = await fs.readFile(resolvedPath, "utf-8");
  } else if (ext === ".docx") {
    const buffer = await fs.readFile(resolvedPath);
    const result = await mammoth.extractRawText({ buffer });
    rawText = result.value;
  } else if (ext === ".pdf") {
    const buffer = await fs.readFile(resolvedPath);
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    rawText = result.text;
  } else {
    // 理论上不会走到这里，因为上面已经检查了扩展名
    throw new Error(
      t("unsupportedFileFormat", {
        ext,
        supported: SUPPORTED_EXTENSIONS.join(", "),
      }),
    );
  }

  // 4. 截断超长内容
  const maxChars = getMaxFileChars();
  const truncated = rawText.length > maxChars;
  const text = truncated ? truncateText(rawText, maxChars) : rawText;

  return { text, truncated };
}

/**
 * 从配置中获取最大文件字符数，回退到默认值。
 */
function getMaxFileChars(): number {
  const configured = getConfig("maxFileChars");
  if (configured) {
    const parsed = parseInt(configured, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return DEFAULT_MAX_FILE_CHARS;
}
