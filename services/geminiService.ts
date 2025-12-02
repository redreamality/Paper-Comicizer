import { PagePlan, ComicPage } from "../types";
import {
  TEXT_MODEL,
  IMAGE_MODEL,
  PROMPT_ANALYSIS,
  PROMPT_PLANNING,
  PROMPT_IMAGE_GENERATION_PREFIX,
  OPENROUTER_BASE_URL,
  APP_REFERER,
  APP_TITLE,
} from "../constants";

type OpenRouterResponse = Record<string, any>;

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const buildUrl = (path: string) =>
  `${OPENROUTER_BASE_URL.replace(/\/$/, "")}${path}`;

const openRouterHeaders = () => {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OpenRouter API Key not found in environment variables");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
  };

  if (APP_REFERER) {
    headers["HTTP-Referer"] = APP_REFERER;
  }
  if (APP_TITLE) {
    headers["X-Title"] = APP_TITLE;
  }

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

const postToOpenRouter = async <T>(
  endpoint: string,
  payload: Record<string, unknown>
): Promise<T> => {
  const response = await fetch(buildUrl(endpoint), {
    method: "POST",
    headers: openRouterHeaders(),
    body: JSON.stringify(payload),
  });

  const data: OpenRouterResponse = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      stringifyIfNeeded(data?.error?.message) ||
      stringifyIfNeeded(data?.error?.code) ||
      stringifyIfNeeded(data?.error) ||
      stringifyIfNeeded(data?.message) ||
      `OpenRouter request failed (${response.status})`;
    throw new Error(message);
  }

  return data as T;
};

const extractText = (data: OpenRouterResponse): string => {
  if (!data) return "";

  if (Array.isArray(data.output)) {
    for (const item of data.output) {
      const content = item?.content;
      if (!content) continue;

      if (Array.isArray(content)) {
        for (const part of content) {
          if (typeof part === "string" && part.trim().length > 0) {
            return part;
          }
          if (typeof part?.text === "string" && part.text.trim().length > 0) {
            return part.text;
          }
          if (
            part?.type === "output_text" &&
            typeof part?.text === "string" &&
            part.text.trim().length > 0
          ) {
            return part.text;
          }
        }
      } else if (typeof content === "string" && content.trim().length > 0) {
        return content;
      }
    }
  }

  if (Array.isArray(data.output_text) && data.output_text.length > 0) {
    return data.output_text.join("\n");
  }

  if (Array.isArray(data.choices) && data.choices.length > 0) {
    const choice = data.choices[0];
    const content = choice?.message?.content ?? choice?.content ?? choice?.text;
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
      for (const part of content) {
        if (typeof part?.text === "string" && part.text.trim().length > 0) {
          return part.text;
        }
        if (typeof part === "string" && part.trim().length > 0) {
          return part;
        }
      }
    }
  }

  if (typeof data.text === "string" && data.text.trim().length > 0) {
    return data.text;
  }

  return "";
};

const extractImageUrl = (data: OpenRouterResponse): { url: string; mime: string } | null => {
  if (!data) return null;

  // Handle chat completions response format (standard for OpenRouter)
  if (Array.isArray(data.choices) && data.choices.length > 0) {
    const choice = data.choices[0];
    const message = choice?.message;

    // Check for images array in the message (OpenRouter format: { image_url: { url: "..." } })
    if (Array.isArray(message?.images) && message.images.length > 0) {
      const image = message.images[0];
      // Handle object format: { image_url: { url: "data:..." } }
      if (image?.image_url?.url) {
        return { url: image.image_url.url, mime: "image/png" };
      }
      // Fallback: handle direct string format
      if (typeof image === "string" && image.startsWith("data:")) {
        return { url: image, mime: "image/png" };
      }
    }

    // Check for content array with image parts
    if (Array.isArray(message?.content)) {
      for (const part of message.content) {
        if (part?.type === "image_url" && part?.image_url?.url) {
          const url = part.image_url.url;
          const mime = part.image_url.mime_type ?? "image/png";
          return { url, mime };
        }
      }
    }
  }

  // Legacy response format handling
  if (Array.isArray(data.output)) {
    for (const item of data.output) {
      if (!Array.isArray(item?.content)) continue;
      for (const part of item.content) {
        if (part?.type === "output_image") {
          if (part?.image_url?.url) {
            return { url: part.image_url.url, mime: part.image_url.mime_type ?? "image/png" };
          }
          if (part?.image_base64) {
            return {
              url: `data:${part?.mime_type ?? "image/png"};base64,${part.image_base64}`,
              mime: part?.mime_type ?? "image/png",
            };
          }
        }
        if (part?.type === "image_url" && part?.image_url?.url) {
          return { url: part.image_url.url, mime: part.image_url.mime_type ?? "image/png" };
        }
        if (part?.b64_json) {
          return {
            url: `data:${part?.mime_type ?? "image/png"};base64,${part.b64_json}`,
            mime: part?.mime_type ?? "image/png",
          };
        }
      }
    }
  }

  if (Array.isArray(data.data) && data.data.length > 0) {
    const entry = data.data[0];
    if (entry?.url) {
      return { url: entry.url, mime: entry.mime_type ?? "image/png" };
    }
    if (entry?.b64_json) {
      return {
        url: `data:${entry?.mime_type ?? "image/png"};base64,${entry.b64_json}`,
        mime: entry?.mime_type ?? "image/png",
      };
    }
  }

  return null;
};

const encodeDataUrl = (mimeType: string, base64: string) =>
  `data:${mimeType};base64,${base64}`;

/**
 * Step 1: Analyze the paper and get the main idea in Doraemon style.
 */
export const analyzePaper = async (
  fileBase64: string,
  mimeType: string
): Promise<string> => {
  try {
    const pdfDataUrl = encodeDataUrl(mimeType, fileBase64);
    const payload = {
      model: TEXT_MODEL,
      temperature: 0.7,
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

    const response = await postToOpenRouter("/chat/completions", payload);
    return extractText(response) || "Failed to generate analysis.";
  } catch (error) {
    console.error("Analysis Error:", error);
    throw new Error("Failed to analyze the paper.");
  }
};

/**
 * Step 2: Plan the storybook pages.
 */
export const planStory = async (analysisContext: string): Promise<PagePlan[]> => {
  try {
    const payload = {
      model: TEXT_MODEL,
      temperature: 0.5,
      messages: [
        {
          role: "system",
          content: [
            {
              type: "text",
              text: "You design Doraemon comic lesson plans. Respond strictly with JSON arrays of {pageNumber:number, description:string, visualCue:string}.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Context: ${analysisContext}\n${PROMPT_PLANNING}\n请使用 JSON 数组输出（仅 JSON，无额外文字），字段为 pageNumber (number), description (string), visualCue (string)。`,
            },
          ],
        },
      ],
    };

    const response = await postToOpenRouter("/chat/completions", payload);
    const text = extractText(response);

    if (!text) {
      throw new Error("No plan generated");
    }

    try {
      const parsed = JSON.parse(text) as PagePlan[];
      return parsed;
    } catch (jsonError) {
      console.warn("Plan JSON parse error, attempting to fix:", jsonError);
      const fixedText = text
        .replace(/(\w+):/g, '"$1":')
        .replace(/'/g, '"');
      const parsed = JSON.parse(fixedText) as PagePlan[];
      return parsed;
    }
  } catch (error) {
    console.error("Planning Error:", error);
    throw new Error("Failed to plan the comic book structure.");
  }
};

/**
 * Step 3: Generate a single page image.
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
    const payload = {
      model: IMAGE_MODEL,
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

    const response = await postToOpenRouter("/chat/completions", payload);
    const image = extractImageUrl(response);

    if (!image) {
      // Log the full response for debugging
      console.error("Full API response:", JSON.stringify(response, null, 2));
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
