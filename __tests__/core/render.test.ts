import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

// Mock @antv/infographic/ssr — vi.hoisted 保证变量在 vi.mock 工厂之前初始化
const { mockRenderToString } = vi.hoisted(() => {
  const mockRenderToString = vi.fn();
  return { mockRenderToString };
});
vi.mock("@antv/infographic/ssr", () => ({
  renderToString: mockRenderToString,
}));

import {
  resolveOutputPath,
  writeSVGFile,
  renderDSLToSVG,
} from "../../src/core/render.js";

describe("core/render", () => {
  describe("resolveOutputPath()", () => {
    it("未指定时应返回 infographic-output.svg", () => {
      const result = resolveOutputPath();
      expect(result).toMatch(/infographic-output\.svg$/);
    });

    it("未指定时应返回绝对路径", () => {
      const result = resolveOutputPath();
      expect(path.isAbsolute(result)).toBe(true);
    });

    it("指定 .svg 文件时应原样返回", () => {
      const result = resolveOutputPath("output.svg");
      expect(result).toBe("output.svg");
    });

    it("不带 .svg 扩展名时应自动补全", () => {
      const result = resolveOutputPath("my-chart");
      expect(result).toBe("my-chart.svg");
    });

    it("已有 .svg 扩展名时不应重复添加", () => {
      const result = resolveOutputPath("result.svg");
      expect(result).toBe("result.svg");
      expect(result).not.toBe("result.svg.svg");
    });

    it("支持带目录的路径", () => {
      const result = resolveOutputPath("output/charts/my-chart");
      expect(result).toBe("output/charts/my-chart.svg");
    });

    it("支持带目录的 .svg 路径", () => {
      const result = resolveOutputPath("output/charts/my-chart.svg");
      expect(result).toBe("output/charts/my-chart.svg");
    });

    it("空字符串应视为未指定", () => {
      const result = resolveOutputPath("");
      expect(result).toMatch(/infographic-output\.svg$/);
    });
  });

  describe("writeSVGFile()", () => {
    let tmpDir: string;

    beforeEach(async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "infographic-test-"));
    });

    afterEach(async () => {
      await fs.rm(tmpDir, { recursive: true, force: true });
    });

    it("应正确写入 SVG 内容", async () => {
      const outputPath = path.join(tmpDir, "test.svg");
      const svgContent =
        '<svg xmlns="http://www.w3.org/2000/svg"><text>Hello</text></svg>';

      await writeSVGFile(outputPath, svgContent);

      const written = await fs.readFile(outputPath, "utf-8");
      expect(written).toBe(svgContent);
    });

    it("应自动创建中间目录", async () => {
      const outputPath = path.join(tmpDir, "sub", "dir", "deep", "test.svg");
      const svgContent = "<svg></svg>";

      await writeSVGFile(outputPath, svgContent);

      const written = await fs.readFile(outputPath, "utf-8");
      expect(written).toBe(svgContent);
    });

    it("应覆盖已存在的文件", async () => {
      const outputPath = path.join(tmpDir, "overwrite.svg");

      await writeSVGFile(outputPath, "<svg>first</svg>");
      await writeSVGFile(outputPath, "<svg>second</svg>");

      const written = await fs.readFile(outputPath, "utf-8");
      expect(written).toBe("<svg>second</svg>");
    });

    it("应以 UTF-8 编码写入", async () => {
      const outputPath = path.join(tmpDir, "utf8.svg");
      const svgContent = "<svg><text>中文测试 🎨</text></svg>";

      await writeSVGFile(outputPath, svgContent);

      const written = await fs.readFile(outputPath, "utf-8");
      expect(written).toBe(svgContent);
    });

    it("写入大文件不应报错", async () => {
      const outputPath = path.join(tmpDir, "large.svg");
      // 生成约 100KB 的 SVG
      const bigContent = "<svg>" + "x".repeat(100_000) + "</svg>";

      await writeSVGFile(outputPath, bigContent);

      const stat = await fs.stat(outputPath);
      expect(stat.size).toBeGreaterThan(100_000);
    });
  });

  describe("renderDSLToSVG()", () => {
    beforeEach(() => {
      mockRenderToString.mockReset();
    });

    it("正常渲染应返回 SVG 字符串", async () => {
      mockRenderToString.mockResolvedValue("<svg>mocked</svg>");
      const result = await renderDSLToSVG(
        "infographic list-grid-badge-card\ndata\n  title Test",
      );
      expect(result).toBe("<svg>mocked</svg>");
    });

    it("应传递 DSL 语法给 renderToString", async () => {
      mockRenderToString.mockResolvedValue("<svg>ok</svg>");
      const syntax =
        "infographic chart-column-simple\ndata\n  values\n    - label A\n      value 10";
      await renderDSLToSVG(syntax);
      expect(mockRenderToString).toHaveBeenCalledWith(syntax);
    });

    it("返回空字符串时应抛出错误", async () => {
      mockRenderToString.mockResolvedValue("");
      await expect(
        renderDSLToSVG("infographic list-grid-badge-card"),
      ).rejects.toThrow("SSR 渲染失败");
    });

    it("返回纯空白字符串时应抛出错误", async () => {
      mockRenderToString.mockResolvedValue("   \n  ");
      await expect(
        renderDSLToSVG("infographic list-grid-badge-card"),
      ).rejects.toThrow("SSR 渲染失败");
    });

    it("返回 null 时应抛出错误", async () => {
      mockRenderToString.mockResolvedValue(null);
      await expect(
        renderDSLToSVG("infographic list-grid-badge-card"),
      ).rejects.toThrow("SSR 渲染失败");
    });

    it("renderToString 抛出异常时应包装为友好消息", async () => {
      mockRenderToString.mockRejectedValue(new Error("Template not found"));
      await expect(renderDSLToSVG("infographic invalid")).rejects.toThrow(
        "SSR 渲染失败: Template not found",
      );
    });

    it("renderToString 抛出非 Error 异常时也应处理", async () => {
      mockRenderToString.mockRejectedValue("unknown error string");
      await expect(renderDSLToSVG("infographic invalid")).rejects.toThrow(
        "SSR 渲染失败: unknown error string",
      );
    });
  });
});
