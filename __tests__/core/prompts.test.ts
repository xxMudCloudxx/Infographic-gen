import { describe, it, expect } from "vitest";
import {
  INFOGRAPHIC_CREATOR_SYSTEM_PROMPT,
  SELF_CORRECTION_PROMPT_TEMPLATE,
} from "../../src/core/prompts.js";

describe("core/prompts", () => {
  describe("INFOGRAPHIC_CREATOR_SYSTEM_PROMPT", () => {
    it("应为非空字符串", () => {
      expect(typeof INFOGRAPHIC_CREATOR_SYSTEM_PROMPT).toBe("string");
      expect(INFOGRAPHIC_CREATOR_SYSTEM_PROMPT.length).toBeGreaterThan(100);
    });

    it("应包含 AntV Infographic 关键词", () => {
      expect(INFOGRAPHIC_CREATOR_SYSTEM_PROMPT).toContain("AntV Infographic");
    });

    it("应包含 DSL 语法说明", () => {
      expect(INFOGRAPHIC_CREATOR_SYSTEM_PROMPT).toContain("infographic");
      expect(INFOGRAPHIC_CREATOR_SYSTEM_PROMPT).toContain("data");
      expect(INFOGRAPHIC_CREATOR_SYSTEM_PROMPT).toContain("theme");
    });

    it("应包含至少部分可用模板", () => {
      expect(INFOGRAPHIC_CREATOR_SYSTEM_PROMPT).toContain(
        "list-row-horizontal-icon-arrow",
      );
      expect(INFOGRAPHIC_CREATOR_SYSTEM_PROMPT).toContain(
        "chart-column-simple",
      );
      expect(INFOGRAPHIC_CREATOR_SYSTEM_PROMPT).toContain("compare-swot");
      expect(INFOGRAPHIC_CREATOR_SYSTEM_PROMPT).toContain(
        "hierarchy-structure",
      );
      expect(INFOGRAPHIC_CREATOR_SYSTEM_PROMPT).toContain(
        "sequence-timeline-simple",
      );
      expect(INFOGRAPHIC_CREATOR_SYSTEM_PROMPT).toContain(
        "relation-dagre-flow-tb-simple-circle-node",
      );
    });

    it("应包含模板分类说明", () => {
      expect(INFOGRAPHIC_CREATOR_SYSTEM_PROMPT).toContain("list-*");
      expect(INFOGRAPHIC_CREATOR_SYSTEM_PROMPT).toContain("sequence-*");
      expect(INFOGRAPHIC_CREATOR_SYSTEM_PROMPT).toContain("compare-*");
      expect(INFOGRAPHIC_CREATOR_SYSTEM_PROMPT).toContain("hierarchy-*");
      expect(INFOGRAPHIC_CREATOR_SYSTEM_PROMPT).toContain("chart-*");
      expect(INFOGRAPHIC_CREATOR_SYSTEM_PROMPT).toContain("relation-*");
    });

    it("应包含语法规范要点", () => {
      // 第一行必须是 infographic <template-name>
      expect(INFOGRAPHIC_CREATOR_SYSTEM_PROMPT).toContain("第一行必须是");
      // 两个空格缩进
      expect(INFOGRAPHIC_CREATOR_SYSTEM_PROMPT).toContain("两个空格缩进");
    });

    it("应包含主数据字段选择规范", () => {
      expect(INFOGRAPHIC_CREATOR_SYSTEM_PROMPT).toContain("lists");
      expect(INFOGRAPHIC_CREATOR_SYSTEM_PROMPT).toContain("sequences");
      expect(INFOGRAPHIC_CREATOR_SYSTEM_PROMPT).toContain("compares");
      expect(INFOGRAPHIC_CREATOR_SYSTEM_PROMPT).toContain("values");
      expect(INFOGRAPHIC_CREATOR_SYSTEM_PROMPT).toContain("nodes");
      expect(INFOGRAPHIC_CREATOR_SYSTEM_PROMPT).toContain("relations");
    });

    it("应包含主题/风格说明", () => {
      expect(INFOGRAPHIC_CREATOR_SYSTEM_PROMPT).toContain("palette");
      expect(INFOGRAPHIC_CREATOR_SYSTEM_PROMPT).toContain("rough");
      expect(INFOGRAPHIC_CREATOR_SYSTEM_PROMPT).toContain("stylize");
    });

    it("应包含只输出 DSL 的约束", () => {
      expect(INFOGRAPHIC_CREATOR_SYSTEM_PROMPT).toContain("只输出纯 DSL 语法");
    });

    it("应包含尊重用户语言的约束", () => {
      expect(INFOGRAPHIC_CREATOR_SYSTEM_PROMPT).toContain(
        "必须尊重用户输入语言",
      );
    });

    it("应包含完整数据示例", () => {
      expect(INFOGRAPHIC_CREATOR_SYSTEM_PROMPT).toContain("数据语法示例");
    });

    it("应包含模板选择建议", () => {
      expect(INFOGRAPHIC_CREATOR_SYSTEM_PROMPT).toContain("模板选择建议");
    });
  });

  describe("SELF_CORRECTION_PROMPT_TEMPLATE", () => {
    it("应为非空字符串", () => {
      expect(typeof SELF_CORRECTION_PROMPT_TEMPLATE).toBe("string");
      expect(SELF_CORRECTION_PROMPT_TEMPLATE.length).toBeGreaterThan(50);
    });

    it("应包含 {error} 占位符", () => {
      expect(SELF_CORRECTION_PROMPT_TEMPLATE).toContain("{error}");
    });

    it("应包含 {syntax} 占位符", () => {
      expect(SELF_CORRECTION_PROMPT_TEMPLATE).toContain("{syntax}");
    });

    it("应包含修正指导语", () => {
      expect(SELF_CORRECTION_PROMPT_TEMPLATE).toContain("修正");
    });

    it("占位符替换应正确工作", () => {
      const result = SELF_CORRECTION_PROMPT_TEMPLATE.replace(
        "{error}",
        "TypeError: xxx",
      ).replace("{syntax}", "infographic list-grid-badge-card");
      expect(result).toContain("TypeError: xxx");
      expect(result).toContain("infographic list-grid-badge-card");
      expect(result).not.toContain("{error}");
      expect(result).not.toContain("{syntax}");
    });
  });
});
