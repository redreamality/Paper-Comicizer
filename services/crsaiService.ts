import { PagePlan, ComicPage } from "../types";
import {
  PROMPT_ANALYSIS,
  PROMPT_PLANNING,
  PROMPT_IMAGE_GENERATION_PREFIX,
  CRSAI_BASE_URL,
  CRSAI_API_KEY,
  CRSAI_IMAGE_MODEL,
  CRSAI_TEXT_MODEL,
  CRSAI_CHAT_API_PATH,
} from "../constants";

type CRSAIResponse = Record<string, any>;

interface CRSAIDrawResponse {
  code: number;
  data?: {
    id: string;
  };
  message?: string;
}

interface CRSAIResultResponse {
  code: number;
  data?: {
    status: string;
    results?: Array<{
      url: string;
    }>;
    failure_reason?: string;
    error?: string;
  };
  message?: string;
}

interface CRSAIGeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: {
          mimeType: string;
          data: string;
        };
      }>;
    };
  }>;
}

const getCRSAIApiKey = (): string => {
  // 1. 尝试从localStorage获取
  try {
    const stored = localStorage.getItem('paper_comicizer_api_keys');
    if (stored) {
      const keys = JSON.parse(stored);
      if (keys.crsaiApiKey && keys.isValid?.crsai) {
        return keys.crsaiApiKey;
      }
    }
  } catch (error) {
    console.error('Failed to parse stored API keys:', error);
  }

  // 2. 回退到环境变量
  const envKey = import.meta.env.VITE_CRSAI_API_KEY;
  if (envKey) {
    return envKey;
  }

  // 3. 回退到常量
  if (CRSAI_API_KEY) {
    return CRSAI_API_KEY;
  }

  // 4. 没有找到密钥
  return '';
};

const buildCRSAIUrl = (path: string) =>
  `${CRSAI_BASE_URL.replace(/\/$/, "")}${path}`;

const crsaiHeaders = () => {
  const apiKey = getCRSAIApiKey();
  if (!apiKey) {
    throw new Error("CRSAI API Key not found. Please configure your API key in the settings.");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  return headers;
};

const stringifyIfNeeded = (value: unknown) => {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  try {
    if (value instanceof Error) {
      return value.message;
    }
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const postToCRSAI = async <T>(
  endpoint: string,
  payload: Record<string, unknown>
): Promise<T> => {
  const response = await fetch(buildCRSAIUrl(endpoint), {
    method: "POST",
    headers: crsaiHeaders(),
    body: JSON.stringify(payload),
  });

  const data: CRSAIResponse = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      stringifyIfNeeded(data?.error?.message) ||
      stringifyIfNeeded(data?.error?.code) ||
      stringifyIfNeeded(data?.error) ||
      stringifyIfNeeded(data?.message) ||
      `CRSAI request failed (${response.status})`;
    throw new Error(message);
  }

  return data as T;
};

// CRSAI Chat API调用函数
const postToCRSAIChat = async <T>(
  payload: Record<string, unknown>
): Promise<T> => {
  console.log("CRSAI Chat API Request:", {
    url: buildCRSAIUrl(CRSAI_CHAT_API_PATH),
    model: payload.model,
    messageCount: (payload.messages as any[])?.length,
    // Don't log full payload to avoid console spam with large PDFs
  });

  const response = await fetch(buildCRSAIUrl(CRSAI_CHAT_API_PATH), {
    method: "POST",
    headers: crsaiHeaders(),
    body: JSON.stringify(payload),
  });

  // Get raw text first for debugging
  const rawText = await response.text();
  console.log("CRSAI Chat API Raw Response:", {
    status: response.status,
    ok: response.ok,
    contentType: response.headers.get('content-type'),
    bodyLength: rawText.length,
    bodyPreview: rawText.substring(0, 500)
  });

  // Try to parse as JSON
  let data: CRSAIResponse = {};
  try {
    data = JSON.parse(rawText);
  } catch (parseError) {
    console.error("CRSAI Chat API - Failed to parse response as JSON:", parseError);
    console.error("Raw response text:", rawText);

    // CRSAI可能返回多个JSON对象（即使stream:false），尝试解析第一个
    try {
      // 尝试找到第一个完整的JSON对象
      const jsonMatch = rawText.match(/^\{[^}]*\}(?:\{|$)/);
      if (jsonMatch) {
        // 提取第一个大括号对
        let braceCount = 0;
        let firstJsonEnd = 0;
        for (let i = 0; i < rawText.length; i++) {
          if (rawText[i] === '{') braceCount++;
          if (rawText[i] === '}') braceCount--;
          if (braceCount === 0 && i > 0) {
            firstJsonEnd = i + 1;
            break;
          }
        }
        const firstJson = rawText.substring(0, firstJsonEnd);
        console.log("CRSAI Chat API - Attempting to parse first JSON object:", firstJson);
        data = JSON.parse(firstJson);
        console.log("CRSAI Chat API - Successfully parsed first JSON object");
      }
    } catch (fallbackError) {
      console.error("CRSAI Chat API - Fallback parsing also failed:", fallbackError);
    }
  }

  console.log("CRSAI Chat API Parsed Response:", {
    status: response.status,
    ok: response.ok,
    data: JSON.stringify(data, null, 2)
  });

  // 检查响应中的错误（即使status是200）
  if (data?.choices?.[0]?.message?.content === "INVALID_ARGUMENT") {
    const errorMsg = "CRSAI API returned INVALID_ARGUMENT. This likely means:\n" +
      "1. The gemini-2.5-pro model doesn't support PDF through image_url\n" +
      "2. The PDF data URL format is not accepted\n" +
      "3. The multimodal content format is incorrect\n\n" +
      "Suggestion: Try using CRSAI's nano-banana model for image generation instead, " +
      "or use OpenRouter for PDF analysis.";
    console.error("CRSAI API Error:", errorMsg);
    throw new Error(errorMsg);
  }

  if (!response.ok) {
    const message =
      stringifyIfNeeded(data?.error?.message) ||
      stringifyIfNeeded(data?.error?.code) ||
      stringifyIfNeeded(data?.error) ||
      stringifyIfNeeded(data?.message) ||
      rawText ||
      `CRSAI Chat API request failed (${response.status})`;
    throw new Error(message);
  }

  return data as T;
};

// 使用CRSAI的绘画接口生成图片
const generateImageWithCRSAI = async (
  prompt: string,
  aspectRatio: string = "2:3"
): Promise<{ url: string; mime: string } | null> => {
  try {
    // 根据CRSAI API文档，使用绘画接口
    const payload = {
      model: CRSAI_IMAGE_MODEL,
      prompt: prompt,
      aspectRatio: aspectRatio,
      imageSize: "1K",
      urls: [], // 可选，参考图URL
      webHook: "-1", // 使用"-1"表示不使用回调，立即返回id
      shutProgress: false,
    };

    console.log("Calling CRSAI draw API with payload:", JSON.stringify(payload, null, 2));

    const response = await postToCRSAI<CRSAIDrawResponse>("/v1/draw/nano-banana", payload);

    console.log("CRSAI draw API response:", JSON.stringify(response, null, 2));

    // 根据文档，webHook参数为"-1"时，会立即返回一个id
    if (response.code === 0 && response.data?.id) {
      const taskId = response.data.id;

      // 使用结果接口获取图片
      const resultPayload = {
        id: taskId,
      };

      console.log("Polling result for taskId:", taskId);

      // 轮询获取结果 - 增加超时时间以适应图像生成
      let attempts = 0;
      const maxAttempts = 60; // 最多尝试60次（之前是30次）
      const delay = 3000; // 每次间隔3秒（之前是2秒）
      const totalTimeout = maxAttempts * delay / 1000; // 180秒 = 3分钟

      console.log(`Starting polling: max ${maxAttempts} attempts, ${delay}ms delay, total timeout: ${totalTimeout}s`);

      while (attempts < maxAttempts) {
        attempts++;

        // 第一次立即查询，后续等待
        if (attempts > 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        try {
          const resultResponse = await postToCRSAI<CRSAIResultResponse>("/v1/draw/result", resultPayload);

          console.log(`Result attempt ${attempts}/${maxAttempts}:`, {
            code: resultResponse.code,
            status: resultResponse.data?.status,
            hasResults: !!resultResponse.data?.results?.length,
            message: resultResponse.message
          });

          if (resultResponse.code === 0 && resultResponse.data) {
            const data = resultResponse.data;

            if (data.status === "succeeded" && data.results && data.results.length > 0) {
              const result = data.results[0];
              if (result.url) {
                console.log(`✅ CRSAI generation succeeded after ${attempts} attempts (${attempts * delay / 1000}s)`);
                return { url: result.url, mime: "image/png" };
              }
            } else if (data.status === "failed") {
              const errorMsg = `CRSAI generation failed: ${data.failure_reason || data.error || "Unknown error"}`;
              console.error(errorMsg);
              throw new Error(errorMsg);
            } else if (data.status === "processing" || data.status === "pending") {
              console.log(`⏳ Still processing... (attempt ${attempts}/${maxAttempts})`);
              // 继续轮询
            } else {
              console.log(`Unknown status: ${data.status}, continuing to poll...`);
            }
          } else if (resultResponse.code === -22) {
            console.error("Task not found, taskId:", taskId);
            throw new Error("Task not found");
          } else {
            console.warn(`Unexpected response code: ${resultResponse.code}, continuing...`);
          }
        } catch (pollError) {
          console.error(`Polling attempt ${attempts} error:`, pollError);
          // 如果不是最后一次尝试，继续轮询
          if (attempts === maxAttempts) {
            throw pollError;
          }
        }
      }

      const timeoutMsg = `CRSAI generation timeout after ${maxAttempts} attempts (${totalTimeout}s). The image may still be generating on the server.`;
      console.error(timeoutMsg);
      throw new Error(timeoutMsg);
    }

    throw new Error("Invalid response from CRSAI API");
  } catch (error) {
    console.error("CRSAI Image Generation Error:", error);
    throw error;
  }
};

// 使用CRSAI的Gemini兼容接口（备选方案）
const generateImageWithCRSAIGemini = async (
  prompt: string
): Promise<{ url: string; mime: string } | null> => {
  try {
    // 使用Gemini官方格式的接口
    const payload = {
      model: CRSAI_IMAGE_MODEL,
      modalities: ["text", "image"],
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
      temperature: 0.85,
    };

    console.log("Calling CRSAI Gemini-compatible API with payload:", JSON.stringify(payload, null, 2));

    const response = await postToCRSAI<CRSAIGeminiResponse>(`/v1beta/models/${CRSAI_IMAGE_MODEL}:streamGenerateContent`, payload);

    console.log("CRSAI Gemini-compatible API response:", JSON.stringify(response, null, 2));

    // 尝试解析响应（可能需要根据实际响应格式调整）
    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        for (const part of candidate.content.parts) {
          if (part.inlineData && part.inlineData.mimeType && part.inlineData.data) {
            return {
              url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
              mime: part.inlineData.mimeType,
            };
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.error("CRSAI Gemini-compatible API Error:", error);
    // 如果Gemini格式失败，回退到绘画接口
    return generateImageWithCRSAI(prompt);
  }
};

const encodeDataUrl = (mimeType: string, base64: string) =>
  `data:${mimeType};base64,${base64}`;

/**
 * 清理JSON文本，处理常见的格式问题
 */
const cleanJSONText = (text: string): string => {
  let cleanedText = text.trim();

  // 移除常见的非JSON前缀
  const prefixesToRemove = [
    /^<think>.*?<\/think>\s*/is,  // 移除<think>标签
    /^```(?:json)?\s*/i,          // 移除Markdown代码块开始
    /\s*```$/i,                   // 移除Markdown代码块结束
    /^Here(?:'s| is) (?:the|a) JSON (?:response|array):\s*/i,
    /^The JSON (?:response|array) is:\s*/i,
    /^JSON (?:response|array):\s*/i,
    /^Response:\s*/i,
    /^Output:\s*/i,
    /^```json\s*/i,               // 移除```json前缀
    /\s*```$/i,                   // 移除```后缀
    /^Sure, here(?:'s| is) (?:the|a) JSON (?:response|array):\s*/i,
    /^Certainly, here(?:'s| is) (?:the|a) JSON (?:response|array):\s*/i,
    /^Of course, here(?:'s| is) (?:the|a) JSON (?:response|array):\s*/i,
  ];

  prefixesToRemove.forEach(regex => {
    cleanedText = cleanedText.replace(regex, '');
  });

  // 移除XML/HTML标签
  cleanedText = cleanedText.replace(/<[^>]*>/g, '');

  // First, extract the JSON array if possible
  const jsonMatch = cleanedText.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    cleanedText = jsonMatch[0];
  }

  // More aggressive cleaning strategies
  // Replace literal newlines and tabs within strings with spaces
  cleanedText = cleanedText.replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\r/g, ' ').replace(/\t/g, ' ');

  // Fix unescaped quotes within string values
  // This is a complex regex that tries to find quotes that should be escaped
  // Pattern: ": "text with "unescaped" quote" -> ": "text with \"unescaped\" quote"
  cleanedText = fixUnescapedQuotes(cleanedText);

  // 尝试多种JSON修复策略
  const strategies = [
    // 策略1: 修复尾随逗号
    (str: string) => str.replace(/,\s*]/g, ']').replace(/,\s*}/g, '}'),

    // 策略2: 修复布尔值（true/false可能被引号包围）
    (str: string) => str.replace(/":\s*"true"/g, '": true')
                        .replace(/":\s*"false"/g, '": false')
                        .replace(/":\s*"null"/g, '": null'),

    // 策略3: Remove extra whitespace
    (str: string) => str.replace(/\s+/g, ' '),

    // 策略4: Fix potential control characters
    (str: string) => str.replace(/[\x00-\x1F\x7F-\x9F]/g, ''),
  ];

  // 应用所有策略
  strategies.forEach(strategy => {
    cleanedText = strategy(cleanedText);
  });

  // 最后修剪
  cleanedText = cleanedText.trim();

  return cleanedText;
};

/**
 * Fix unescaped quotes within JSON string values
 */
const fixUnescapedQuotes = (jsonStr: string): string => {
  let result = '';
  let inString = false;
  let currentKey = '';
  let isKey = false;

  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];
    const prevChar = i > 0 ? jsonStr[i - 1] : '';
    const nextChar = i < jsonStr.length - 1 ? jsonStr[i + 1] : '';

    // Check if this quote is escaped
    const isEscaped = prevChar === '\\';

    if (char === '"' && !isEscaped) {
      // Toggle string state
      if (!inString) {
        // Entering a string
        inString = true;
        result += char;
        // Determine if this is a key or value
        // Look back to see if we just passed a : or ,
        const beforeQuote = result.slice(0, -1).trim();
        isKey = beforeQuote.endsWith(':') === false && (beforeQuote.endsWith('{') || beforeQuote.endsWith(','));
      } else {
        // Potentially exiting a string
        // Check if the next non-whitespace char is a valid JSON separator
        let j = i + 1;
        while (j < jsonStr.length && /\s/.test(jsonStr[j])) j++;
        const nextMeaningful = j < jsonStr.length ? jsonStr[j] : '';

        // Valid separators after a string: , } ] :
        if ([',', '}', ']', ':'].includes(nextMeaningful) || j >= jsonStr.length) {
          // This is a proper closing quote
          inString = false;
          isKey = false;
          result += char;
        } else {
          // This quote is inside the string and should be escaped
          result += '\\"';
        }
      }
    } else {
      result += char;
    }
  }

  return result;
};

/**
 * Step 1: Analyze the paper and get the main idea in Doraemon style.
 * 使用CRSAI Chat API进行文本分析
 */
export const analyzePaper = async (
  fileBase64: string,
  mimeType: string
): Promise<string> => {
  try {
    // CRSAI API兼容OpenAI格式，支持多模态输入（类似OpenRouter）
    const pdfDataUrl = encodeDataUrl(mimeType, fileBase64);

    const payload = {
      model: CRSAI_TEXT_MODEL,
      temperature: 0.7,
      stream: false,  // 明确指定非流式响应
      messages: [
        {
          role: "system",
          content: [
            {
              type: "text",
              text: "You are Doraemon and Nobita acting as playful academic tutors who break down scholarly PDFs into joyful explanations for kids.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: PROMPT_ANALYSIS,
            },
            {
              type: "image_url",
              image_url: {
                url: pdfDataUrl,
              },
            },
            {
              type: "text",
              text: `The previous attachment is the academic PDF in data URL format (${mimeType}). Read it carefully before answering.`,
            },
          ],
        },
      ],
    };

    console.log("CRSAI analyzePaper - Sending request with PDF data URL (length:", pdfDataUrl.length, ")");

    // 使用CRSAI Chat API进行文本分析
    const data = await postToCRSAIChat<CRSAIResponse>(payload);

    // 提取文本（添加调试信息）
    const extractText = (data: CRSAIResponse): string => {
      console.log("CRSAI extractText - Raw data:", JSON.stringify(data, null, 2));

      if (!data) {
        console.log("CRSAI extractText - No data");
        return "";
      }

      // 尝试OpenAI兼容格式：{choices: [{message: {content: "..."}}]}
      if (Array.isArray(data.choices) && data.choices.length > 0) {
        console.log("CRSAI extractText - Found choices array");
        const choice = data.choices[0];
        console.log("CRSAI extractText - First choice:", choice);

        const content = choice?.message?.content ?? choice?.content ?? choice?.text;
        console.log("CRSAI extractText - Extracted content:", content);

        if (typeof content === "string" && content.trim().length > 0) {
          console.log("CRSAI extractText - Returning string content");
          return content;
        }

        if (Array.isArray(content)) {
          console.log("CRSAI extractText - Content is array");
          for (const part of content) {
            if (typeof part?.text === "string" && part.text.trim().length > 0) {
              console.log("CRSAI extractText - Returning text from array part");
              return part.text;
            }
            if (typeof part === "string" && part.trim().length > 0) {
              console.log("CRSAI extractText - Returning string from array");
              return part;
            }
          }
        }
      }

      // 尝试其他常见格式
      if (typeof data.text === "string" && data.text.trim().length > 0) {
        console.log("CRSAI extractText - Returning data.text");
        return data.text;
      }

      if (Array.isArray(data.output_text) && data.output_text.length > 0) {
        console.log("CRSAI extractText - Returning output_text array");
        return data.output_text.join("\n");
      }

      if (Array.isArray(data.output)) {
        console.log("CRSAI extractText - Found output array");
        for (const item of data.output) {
          const content = item?.content;
          if (!content) continue;

          if (Array.isArray(content)) {
            for (const part of content) {
              if (typeof part === "string" && part.trim().length > 0) {
                console.log("CRSAI extractText - Returning string from output array");
                return part;
              }
              if (typeof part?.text === "string" && part.text.trim().length > 0) {
                console.log("CRSAI extractText - Returning text from output array");
                return part.text;
              }
            }
          } else if (typeof content === "string" && content.trim().length > 0) {
            console.log("CRSAI extractText - Returning string content from output");
            return content;
          }
        }
      }

      console.log("CRSAI extractText - No text found in response");
      return "";
    };

    return extractText(data) || "Failed to generate analysis.";
  } catch (error) {
    console.error("CRSAI Analysis Error:", error);
    throw new Error("Failed to analyze the paper with CRSAI.");
  }
};

/**
 * Step 2: Plan the storybook pages.
 * 使用CRSAI Chat API进行故事规划
 */
export const planStory = async (analysisContext: string): Promise<PagePlan[]> => {
  try {
    const payload = {
      model: CRSAI_TEXT_MODEL,
      temperature: 0.3, // 降低温度以获得更确定的输出
      stream: false,  // 明确指定非流式响应
      messages: [
        {
          role: "system",
          content: "You are a JSON generator. You MUST respond with ONLY a valid JSON array, no other text, no explanations, no thinking process. The JSON array must contain objects with these exact fields: pageNumber (number), description (string), visualCue (string).",
        },
        {
          role: "user",
          content: `Context: ${analysisContext}\n${PROMPT_PLANNING}\n\nIMPORTANT: Respond with ONLY a valid JSON array. No thinking tags, no explanations, no markdown, no other text. Example format:\n[\n  {\n    "pageNumber": 1,\n    "description": "...",\n    "visualCue": "..."\n  }\n]`,
        },
      ],
    };

    // 使用CRSAI Chat API进行故事规划
    const data = await postToCRSAIChat<CRSAIResponse>(payload);

    // 提取文本（添加调试信息）
    const extractText = (data: CRSAIResponse): string => {
      console.log("CRSAI planStory extractText - Raw data:", JSON.stringify(data, null, 2));

      if (!data) {
        console.log("CRSAI planStory extractText - No data");
        return "";
      }

      // 尝试OpenAI兼容格式：{choices: [{message: {content: "..."}}]}
      if (Array.isArray(data.choices) && data.choices.length > 0) {
        console.log("CRSAI planStory extractText - Found choices array");
        const choice = data.choices[0];
        console.log("CRSAI planStory extractText - First choice:", choice);

        const content = choice?.message?.content ?? choice?.content ?? choice?.text;
        console.log("CRSAI planStory extractText - Extracted content:", content);

        if (typeof content === "string" && content.trim().length > 0) {
          console.log("CRSAI planStory extractText - Returning string content");
          return content;
        }

        if (Array.isArray(content)) {
          console.log("CRSAI planStory extractText - Content is array");
          for (const part of content) {
            if (typeof part?.text === "string" && part.text.trim().length > 0) {
              console.log("CRSAI planStory extractText - Returning text from array part");
              return part.text;
            }
            if (typeof part === "string" && part.trim().length > 0) {
              console.log("CRSAI planStory extractText - Returning string from array");
              return part;
            }
          }
        }
      }

      // 尝试其他常见格式
      if (typeof data.text === "string" && data.text.trim().length > 0) {
        console.log("CRSAI planStory extractText - Returning data.text");
        return data.text;
      }

      if (Array.isArray(data.output_text) && data.output_text.length > 0) {
        console.log("CRSAI planStory extractText - Returning output_text array");
        return data.output_text.join("\n");
      }

      if (Array.isArray(data.output)) {
        console.log("CRSAI planStory extractText - Found output array");
        for (const item of data.output) {
          const content = item?.content;
          if (!content) continue;

          if (Array.isArray(content)) {
            for (const part of content) {
              if (typeof part === "string" && part.trim().length > 0) {
                console.log("CRSAI planStory extractText - Returning string from output array");
                return part;
              }
              if (typeof part?.text === "string" && part.text.trim().length > 0) {
                console.log("CRSAI planStory extractText - Returning text from output array");
                return part.text;
              }
            }
          } else if (typeof content === "string" && content.trim().length > 0) {
            console.log("CRSAI planStory extractText - Returning string content from output");
            return content;
          }
        }
      }

      console.log("CRSAI planStory extractText - No text found in response");
      return "";
    };

    const text = extractText(data);

    if (!text) {
      throw new Error("No plan generated");
    }

    console.log("CRSAI planStory - Raw text before cleaning:", text);
    console.log("CRSAI planStory - Raw text length:", text.length);

    // Try multiple parsing strategies in order of likelihood to succeed
    const parsingStrategies = [
      // Strategy 1: Direct parse
      () => {
        console.log("CRSAI planStory - Strategy 1: Direct JSON parse");
        return JSON.parse(text) as PagePlan[];
      },
      // Strategy 2: Clean and parse
      () => {
        console.log("CRSAI planStory - Strategy 2: Clean and parse");
        const cleanedText = cleanJSONText(text);
        console.log("CRSAI planStory - Cleaned text length:", cleanedText.length);
        console.log("CRSAI planStory - First 300 chars of cleaned:", cleanedText.substring(0, 300));
        return JSON.parse(cleanedText) as PagePlan[];
      },
      // Strategy 3: Extract JSON array first, then clean
      () => {
        console.log("CRSAI planStory - Strategy 3: Extract JSON array first");
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error("No JSON array found");
        const cleanedText = cleanJSONText(jsonMatch[0]);
        console.log("CRSAI planStory - Extracted and cleaned, first 300 chars:", cleanedText.substring(0, 300));
        return JSON.parse(cleanedText) as PagePlan[];
      },
      // Strategy 4: More aggressive cleaning - replace all newlines globally first
      () => {
        console.log("CRSAI planStory - Strategy 4: Aggressive cleaning");
        let aggressive = text.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ');
        const jsonMatch = aggressive.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error("No JSON array found");
        aggressive = cleanJSONText(jsonMatch[0]);
        console.log("CRSAI planStory - Aggressively cleaned, first 300 chars:", aggressive.substring(0, 300));
        return JSON.parse(aggressive) as PagePlan[];
      },
      // Strategy 5: Try to manually parse objects from the response
      () => {
        console.log("CRSAI planStory - Strategy 5: Manual object extraction");
        const pageRegex = /"pageNumber"\s*:\s*(\d+)\s*,\s*"description"\s*:\s*"([^"]*(?:\\"[^"]*)*)"\s*,\s*"visualCue"\s*:\s*"([^"]*(?:\\"[^"]*)*)"/g;
        const pages: PagePlan[] = [];
        let match;

        const cleanText = text.replace(/[\r\n\t]+/g, ' ');
        while ((match = pageRegex.exec(cleanText)) !== null) {
          pages.push({
            pageNumber: parseInt(match[1], 10),
            description: match[2].replace(/\\"/g, '"'),
            visualCue: match[3].replace(/\\"/g, '"')
          });
        }

        if (pages.length === 0) throw new Error("No page objects found");
        console.log(`CRSAI planStory - Manually extracted ${pages.length} pages`);
        return pages;
      }
    ];

    // Try each strategy in order
    for (let i = 0; i < parsingStrategies.length; i++) {
      try {
        const parsed = parsingStrategies[i]();
        console.log(`CRSAI planStory - Strategy ${i + 1} successful, parsed ${parsed.length} pages`);
        return parsed;
      } catch (error) {
        console.warn(`CRSAI planStory - Strategy ${i + 1} failed:`, error);

        // Show detailed error info for the last strategy
        if (i === parsingStrategies.length - 1) {
          console.error("CRSAI planStory - All parsing strategies failed");
          console.error("CRSAI planStory - Original text length:", text.length);
          console.error("CRSAI planStory - Original text first 500 chars:", text.substring(0, 500));
          throw new Error("Failed to parse JSON response from CRSAI after trying all strategies");
        }
        // Continue to next strategy
      }
    }
  } catch (error) {
    console.error("CRSAI Planning Error:", error);
    throw new Error("Failed to plan the comic book structure with CRSAI.");
  }
};

/**
 * Step 3: Generate a single page image using CRSAI.
 */
export const generateComicPage = async (
  context: string,
  pagePlan: PagePlan
): Promise<ComicPage> => {
  const prompt = `${PROMPT_IMAGE_GENERATION_PREFIX}第${pagePlan.pageNumber}页的图像（页面分辨率统一为竖屏 2:3，语言是中文）。

  Context: ${context}

  Page Description: ${pagePlan.description}
  Visual Scene: ${pagePlan.visualCue}`;

  try {
    // 使用CRSAI生成图片
    const image = await generateImageWithCRSAI(prompt, "2:3");

    if (!image) {
      throw new Error(`No image generated for page ${pagePlan.pageNumber}`);
    }

    const imageUrl = image.url.startsWith("data:")
      ? image.url
      : `${image.url}`;

    return {
      pageNumber: pagePlan.pageNumber,
      imageUrl,
      description: pagePlan.description,
    };
  } catch (error) {
    console.error(`Image Generation Error (Page ${pagePlan.pageNumber}):`, error);
    throw error;
  }
};