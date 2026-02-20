import fs from "node:fs/promises";
import path from "node:path";
import { renderToString } from "@antv/infographic/ssr";

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
 * 根据用户输入的输出路径，补全默认值。
 * 如果用户未指定，默认为当前目录下的 infographic-output.svg。
 */
export function resolveOutputPath(userOutput?: string): string {
  if (userOutput) {
    // 确保扩展名是 .svg
    if (!userOutput.endsWith(".svg")) {
      return userOutput + ".svg";
    }
    return userOutput;
  }
  return path.resolve(process.cwd(), "infographic-output.svg");
}
