// Environment-aware configuration
const fallback = <T extends string | undefined>(value: T, defaultValue: string) =>
  (value && value.length > 0 ? value : defaultValue);

// Models
export const TEXT_MODEL = fallback(
  import.meta.env.VITE_MODEL_LOGIC,
  'google/gemini-3-pro-preview'
);
export const IMAGE_MODEL = fallback(
  import.meta.env.VITE_MODEL_IMAGE,
  'google/gemini-3-pro-image-preview'
);
export const OPENROUTER_BASE_URL = fallback(
  import.meta.env.VITE_OPENROUTER_BASE_URL,
  'https://openrouter.ai/api/v1'
);
export const APP_REFERER = fallback(import.meta.env.VITE_APP_URL, 'http://localhost:3000');
export const APP_TITLE = fallback(
  import.meta.env.VITE_APP_TITLE,
  'AGI比特君 论文转漫画'
);

// CRSAI Configuration
export const CRSAI_BASE_URL = fallback(
  import.meta.env.VITE_CRSAI_BASE_URL,
  'https://grsai.dakka.com.cn'
);
export const CRSAI_API_KEY = import.meta.env.VITE_CRSAI_API_KEY || '';
export const CRSAI_IMAGE_MODEL = fallback(
  import.meta.env.VITE_CRSAI_IMAGE_MODEL,
  'nano-banana-pro'
);
export const CRSAI_TEXT_MODEL = fallback(
  import.meta.env.VITE_CRSAI_TEXT_MODEL,
  'gemini-2.5-pro'
);
export const CRSAI_CHAT_API_PATH = '/v1/chat/completions';

// Prompts
export const PROMPT_ANALYSIS = "让大雄和哆啦A梦为主人公，以漫画形式，带领读者由浅入深地学习并了解这篇论文。请总结核心内容。";

export const PROMPT_PLANNING = "请基于以上讨论，分析并告知这个漫画学习读本要划分为多少页比较合适，每页内容是什么？";

export const PROMPT_IMAGE_GENERATION_PREFIX = "请生成一张哆啦A梦风格的彩色漫画页面，展示以下内容："; // The suffix "第x页..." is added dynamically
