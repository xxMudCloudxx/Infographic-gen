import { getConfig } from "../config/index.js";

export type Locale = "en" | "zh-CN";

/**
 * 所有翻译文本的定义
 */
const translations = {
  en: {
    // Main program
    programDesc:
      "AI-powered CLI to generate AntV Infographic SVGs from natural language prompts",
    versionFlag: "Display version number",

    // Config command
    configDesc:
      "Manage configuration (API Key, Base URL, Provider, Model, Output Directory)",
    configSetDesc: "Set a configuration value",
    configGetDesc: "Get a single configuration value",
    configListDesc: "List all configuration values",
    configDeleteDesc: "Delete a configuration value (reset to default)",
    configPathDesc: "Show configuration file path",
    configInvalidKey: 'Invalid config key "{key}". Available: {keys}',
    configSetSuccess: "{label} set successfully",
    configNotSet: "{label} not set",
    configCurrent: "Current configuration:",
    configFileLocation: "  Config file location: {path}",
    configResetSuccess: "{label} reset to default",
    configNotSetValue: "(not set)",

    // Generate command
    generateDesc:
      "Generate an SVG infographic from natural language (default command)",
    generatePromptArg: "Describe the infographic you want to create",
    generateOutputOpt:
      "Output SVG file path (default: infographic-YYYYMMDD-HHMMSS.svg in default output directory)",
    generateDslOpt:
      "Save raw DSL syntax to a text file (optional, for debugging or fine-tuning)",
    outputTarget: "Output target: {path}",
    callingAI: "Calling AI to generate infographic syntax...",
    renderingSVG: "Rendering SVG...",
    reRenderingSVG: "Re-rendering SVG...",
    aiCallFailed: "AI call failed",
    renderingFailed: "Rendering failed",
    renderFailedAfterRetries:
      "Failed to generate renderable infographic after {retries} self-correction attempts.",
    lastError: "Last error: {error}",
    dslAutoSaved: "❌ Problematic DSL syntax auto-saved to: {path}",
    dslAutoSaveHint:
      "You can inspect this file to debug the LLM output or refine your prompt.",
    dslForDebug: "Generated DSL syntax (for debugging reference):",
    fileWriteFailed: "File write failed",
    dslSaved: "DSL syntax saved to: {path}",
    dslWriteFailed:
      "DSL file write failed (does not affect main functionality):",
    infographicGenerated: "Infographic generated!",
    svgSaved: "SVG saved to: {path}",
    openInBrowser:
      "You can open the SVG file directly in a browser to view it.",
    selfCorrecting: "AI self-correcting (attempt {attempt}/{max})...",
    selfCorrectionFailed: "Self-correction failed",
    renderFailedRetrying:
      "Render failed, auto-correcting (attempt {attempt}/{max})...",

    // AI errors
    apiKeyNotConfigured:
      "API Key not configured. Please run: infographic-gen config set apiKey <YOUR_KEY>",
    llmEmptyContent: "LLM returned empty content",
    failedAfterRetries:
      "Failed to generate renderable infographic after {retries} retries. Last error: {error}",

    // File reader
    unsupportedFileFormat:
      "Unsupported file format: {ext}. Currently supported: {supported}",
    fileNotFound: "File not found: {path}",
    fileTooLarge: "File too large ({size} MB). Maximum allowed size is 10 MB.",
    parsingFile: "Parsing local file: {path}...",
    fileParsed: "File parsed successfully!",
    fileContentTruncated:
      "Warning: file content is too long and has been auto-truncated. Some information may be lost.",
    generateFileOpt:
      "Provide a local file (.md, .txt, .pdf, .docx) as additional context",
    generateFromDslOpt:
      "Render SVG directly from a DSL text file (skips AI generation)",
    readingDslFile: "Reading DSL file: {path}...",
    dslFileReadSuccess: "DSL file loaded!",
    dslFileNotFound: "DSL file not found: {path}",
    dslFileReadFailed: "Failed to read DSL file",
    fromDslNoPromptNeeded:
      "Using --from-dsl mode: rendering directly from DSL file, no prompt needed.",
  },
  "zh-CN": {
    // Main program
    programDesc: "AI 驱动的信息图生成 CLI —— 输入自然语言，输出精美 SVG 信息图",
    versionFlag: "显示版本号",

    // Config command
    configDesc: "管理配置（API Key、Base URL、Provider、Model、输出目录）",
    configSetDesc: "设置配置项",
    configGetDesc: "查看单个配置项",
    configListDesc: "列出所有配置项",
    configDeleteDesc: "删除配置项（恢复默认值）",
    configPathDesc: "显示配置文件路径",
    configInvalidKey: '无效的配置项 "{key}"，可选项：{keys}',
    configSetSuccess: "{label} 已设置",
    configNotSet: "{label} 尚未设置",
    configCurrent: "当前配置：",
    configFileLocation: "  配置文件位置: {path}",
    configResetSuccess: "{label} 已重置为默认值",
    configNotSetValue: "(未设置)",

    // Generate command
    generateDesc: "根据自然语言描述生成 SVG 信息图（默认命令）",
    generatePromptArg: "描述你想要生成的信息图内容",
    generateOutputOpt:
      "输出 SVG 文件路径（默认：默认输出目录中的 infographic-YYYYMMDD-HHMMSS.svg）",
    generateDslOpt: "将原始 DSL 语法保存到指定文本文件（可选，用于调试或微调）",
    outputTarget: "目标输出：{path}",
    callingAI: "正在调用 AI 生成信息图语法...",
    renderingSVG: "正在渲染 SVG...",
    reRenderingSVG: "正在重新渲染 SVG...",
    aiCallFailed: "AI 调用失败",
    renderingFailed: "渲染最终失败",
    renderFailedAfterRetries:
      "经过 {retries} 次自我修正仍无法生成可渲染的信息图。",
    lastError: "最后一次错误：{error}",
    dslAutoSaved: "❌ 有问题的 DSL 语法已自动保存至：{path}",
    dslAutoSaveHint:
      "你可以检查此文件以排查大模型生成的问题，或用于调试 Prompt。",
    dslForDebug: "生成的 DSL 语法如下（供 debug 参考）：",
    fileWriteFailed: "文件写入失败",
    dslSaved: "DSL 语法已保存至：{path}",
    dslWriteFailed: "DSL 文件写入失败（不影响主要功能）：",
    infographicGenerated: "信息图已生成！",
    svgSaved: "SVG 已保存至：{path}",
    openInBrowser: "可直接在浏览器中打开 SVG 文件查看效果。",
    selfCorrecting: "AI 正在自我修正（第 {attempt}/{max} 次）...",
    selfCorrectionFailed: "自我修正失败",
    renderFailedRetrying: "渲染失败，正在自动修正（第 {attempt}/{max} 次）...",

    // AI errors
    apiKeyNotConfigured:
      "尚未配置 API Key。请先运行：infographic-gen config set apiKey <YOUR_KEY>",
    llmEmptyContent: "LLM 返回了空内容",
    failedAfterRetries:
      "已重试 {retries} 次仍然无法生成可渲染的信息图。最后一次错误：{error}",

    // File reader
    unsupportedFileFormat: "暂不支持 {ext} 格式的文件，目前支持：{supported}",
    fileNotFound: "文件未找到：{path}",
    fileTooLarge: "文件过大（{size} MB），最大允许 10 MB。",
    parsingFile: "正在解析本地文件：{path}...",
    fileParsed: "文件解析成功！",
    fileContentTruncated:
      "警告：文件内容过长，已自动截断，可能会丢失部分信息。",
    generateFileOpt: "提供本地文件（.md, .txt, .pdf, .docx）作为额外上下文",
    generateFromDslOpt: "直接从 DSL 文本文件渲染 SVG（跳过 AI 生成）",
    readingDslFile: "正在读取 DSL 文件：{path}...",
    dslFileReadSuccess: "DSL 文件加载成功！",
    dslFileNotFound: "DSL 文件未找到：{path}",
    dslFileReadFailed: "读取 DSL 文件失败",
    fromDslNoPromptNeeded:
      "使用 --from-dsl 模式：直接从 DSL 文件渲染，无需提示词。",
  },
} as const;

/**
 * 获取当前配置的语言
 */
export function getLocale(): Locale {
  const locale = getConfig("locale");
  return (locale === "zh-CN" ? "zh-CN" : "en") as Locale;
}

/**
 * 获取翻译文本
 * @param key 翻译键
 * @param params 插值参数
 */
export function t(
  key: keyof (typeof translations)["en"],
  params?: Record<string, string | number>,
): string {
  const locale = getLocale();
  let text: string = translations[locale][key];

  if (params) {
    Object.entries(params).forEach(([paramKey, value]) => {
      text = text.replace(`{${paramKey}}`, String(value));
    });
  }

  return text;
}
