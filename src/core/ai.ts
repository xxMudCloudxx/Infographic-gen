import OpenAI from "openai";
import { getLLMConfig } from "../config/index.js";
import {
  INFOGRAPHIC_CREATOR_SYSTEM_PROMPT,
  SELF_CORRECTION_PROMPT_TEMPLATE,
  FILE_CONTEXT_PROMPT_TEMPLATE,
} from "./prompts.js";
import * as log from "../utils/logger.js";
import { updateSpinner } from "../utils/spinner.js";
import { t } from "../utils/i18n.js";

/** LLM 请求返回的结果 */
export interface LLMResult {
  /** 生成的 DSL 语法文本 */
  syntax: string;
  /** 总共重试了几次（0 = 一次成功） */
  attempts: number;
}

/** 最大自我修正重试次数 */
const MAX_RETRIES = 3;

/**
 * 创建一个懒初始化的 OpenAI 客户端。
 * 通过覆盖 baseURL / apiKey 兼容 DeepSeek、阿里云百炼等平台。
 */
function createClient(): OpenAI {
  const { apiKey, baseUrl } = getLLMConfig();

  if (!apiKey) {
    throw new Error(t("apiKeyNotConfigured"));
  }

  return new OpenAI({
    apiKey,
    baseURL: baseUrl,
  });
}

/**
 * 向 LLM 发送请求，获取信息图 DSL。
 *
 * @param userPrompt 用户的自然语言描述
 * @returns LLM 返回的纯 DSL 文本
 */
async function callLLM(
  client: OpenAI,
  model: string,
  messages: OpenAI.ChatCompletionMessageParam[],
): Promise<string> {
  const response = await client.chat.completions.create({
    model,
    messages,
    temperature: 0.7,
    max_tokens: 4096,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error(t("llmEmptyContent"));
  }

  return cleanDSL(content);
}

/**
 * 清理 LLM 返回的文本，去除可能的 Markdown 代码块标记等噪声。
 */
function cleanDSL(raw: string): string {
  let cleaned = raw.trim();

  // 去掉可能包裹的 ```xxx ... ``` 代码块
  const codeBlockMatch = cleaned.match(/^```[\w]*\n?([\s\S]*?)```$/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  // 确保以 infographic 开头
  const infographicIndex = cleaned.indexOf("infographic ");
  if (infographicIndex > 0) {
    cleaned = cleaned.slice(infographicIndex);
  }

  return cleaned;
}

/**
 * 带自我修正机制的 AI 生成入口。
 *
 * 流程：
 * 1. 将用户 Prompt + 系统提示词发给 LLM，获取 DSL。
 * 2. 调用方（generate 命令）会尝试渲染。如果渲染失败，调用 retryWithCorrection。
 * 3. 最多重试 MAX_RETRIES 次。
 *
 * @param userPrompt 用户输入的自然语言
 * @param fileContext 可选的文件上下文（通过 -f 参数传入的文件内容）
 * @returns 生成的 DSL 语法
 */
export async function generateInfographicDSL(
  userPrompt: string,
  fileContext?: string,
): Promise<string> {
  const client = createClient();
  const { modelName } = getLLMConfig();

  const finalPrompt = fileContext
    ? FILE_CONTEXT_PROMPT_TEMPLATE.replace(
        "{fileContent}",
        fileContext,
      ).replace("{userPrompt}", userPrompt)
    : userPrompt;

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: INFOGRAPHIC_CREATOR_SYSTEM_PROMPT },
    { role: "user", content: finalPrompt },
  ];

  return callLLM(client, modelName, messages);
}

/**
 * 自我修正：当 DSL 渲染失败时，把错误信息反馈给 LLM 要求修正。
 *
 * @param originalSyntax  上一次生成的 DSL
 * @param errorMessage    渲染报错信息
 * @param userPrompt      用户原始需求
 * @param attempt         当前第几次重试（从 1 开始）
 * @param fileContext     可选的文件上下文
 * @returns 修正后的 DSL
 */
export async function retryWithCorrection(
  originalSyntax: string,
  errorMessage: string,
  userPrompt: string,
  attempt: number,
  fileContext?: string,
): Promise<string> {
  if (attempt > MAX_RETRIES) {
    throw new Error(
      t("failedAfterRetries", {
        retries: String(MAX_RETRIES),
        error: errorMessage,
      }),
    );
  }

  updateSpinner(
    t("selfCorrecting", { attempt: String(attempt), max: String(MAX_RETRIES) }),
  );
  log.warn(
    t("renderFailedRetrying", {
      attempt: String(attempt),
      max: String(MAX_RETRIES),
    }),
  );

  const client = createClient();
  const { modelName } = getLLMConfig();

  const correctionMessage = SELF_CORRECTION_PROMPT_TEMPLATE.replace(
    "{error}",
    errorMessage,
  ).replace("{syntax}", originalSyntax);

  // 如果有文件上下文，在重试时也保留，让 AI 不丢失参考资料
  const originalUserPrompt = fileContext
    ? FILE_CONTEXT_PROMPT_TEMPLATE.replace(
        "{fileContent}",
        fileContext,
      ).replace("{userPrompt}", userPrompt)
    : userPrompt;

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: INFOGRAPHIC_CREATOR_SYSTEM_PROMPT },
    { role: "user", content: originalUserPrompt },
    { role: "assistant", content: originalSyntax },
    { role: "user", content: correctionMessage },
  ];

  return callLLM(client, modelName, messages);
}

/** 导出最大重试次数常量供外部使用 */
export { MAX_RETRIES };
