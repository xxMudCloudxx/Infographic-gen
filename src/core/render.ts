import fs from "node:fs/promises";
import path from "node:path";
import { renderToString } from "@antv/infographic/ssr";
import { getConfig } from "../config/index.js";

/**
 * 生成带时间戳的默认文件名。
 * 格式：infographic-YYYYMMDD-HHMMSS.svg
 * 例如：infographic-20231024-153022.svg
 */
function generateDefaultFilename(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `infographic-${date}-${time}.svg`;
}

/**
 * 渲染结果
 */
export interface RenderResult {
  /** 生成的 SVG 字符串 */
  svg: string;
}

/**
 * 使用 @antv/infographic SSR 将 DSL 语法渲染为 SVG 字符串。
 *
 * @param syntax AntV Infographic DSL 语法文本
 * @returns SVG 字符串
 * @throws 渲染失败时抛出带有详细错误信息的 Error
 */
export async function renderDSLToSVG(syntax: string): Promise<string> {
  try {
    const svgString = await renderToString(syntax);
    if (!svgString || svgString.trim().length === 0) {
      throw new Error("renderToString 返回了空的 SVG 内容");
    }
    return svgString;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`SSR 渲染失败: ${message}`);
  }
}

/**
 * 将 SVG 字符串写入指定路径。
 * 自动创建所需的中间目录。
 *
 * @param outputPath 输出文件路径
 * @param svgContent SVG 字符串内容
 */
export async function writeSVGFile(
  outputPath: string,
  svgContent: string,
): Promise<void> {
  const absolutePath = path.resolve(outputPath);
  const dir = path.dirname(absolutePath);

  // 确保输出目录存在
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(absolutePath, svgContent, "utf-8");
}

/**
 * 将 DSL 语法文本写入指定路径。
 * 自动创建所需的中间目录。
 *
 * @param outputPath 输出文件路径
 * @param dslContent DSL 语法字符串
 */
export async function writeDSLFile(
  outputPath: string,
  dslContent: string,
): Promise<void> {
  const absolutePath = path.resolve(outputPath);
  const dir = path.dirname(absolutePath);

  // 确保输出目录存在
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(absolutePath, dslContent, "utf-8");
}

/**
 * 根据用户输入的输出路径，补全默认值。
 * 支持配置默认输出目录，如果用户未指定，默认为 defaultOutputDir 下的
 * infographic-YYYYMMDD-HHMMSS.svg（使用当前时间戳）。
 *
 * @param userOutput 用户指定的输出路径（可选）
 * @returns 完整的输出路径（绝对路径或相对路径）
 */
export function resolveOutputPath(userOutput?: string): string {
  const defaultDir = getConfig("defaultOutputDir") || ".";

  if (userOutput) {
    // 用户指定了输出路径
    // 确保扩展名是 .svg
    const withExt = userOutput.endsWith(".svg")
      ? userOutput
      : userOutput + ".svg";

    // 如果是绝对路径，直接返回；否则相对于默认目录
    if (path.isAbsolute(withExt)) {
      return withExt;
    }
    return path.resolve(defaultDir, withExt);
  }

  // 用户未指定，使用默认输出目录 + 时间戳文件名
  return path.resolve(defaultDir, generateDefaultFilename());
}
