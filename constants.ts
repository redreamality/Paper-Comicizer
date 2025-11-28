// Models
export const TEXT_MODEL = 'gemini-3-pro-preview';
export const IMAGE_MODEL = 'gemini-3-pro-image-preview';

// Prompts
export const PROMPT_ANALYSIS = "让大雄和哆啦A梦为主人公，以漫画形式，带领读者由浅入深地学习并了解这篇论文。请总结核心内容。";

export const PROMPT_PLANNING = "请基于以上讨论，分析并告知这个漫画学习读本要划分为多少页比较合适，每页内容是什么？";

export const PROMPT_IMAGE_GENERATION_PREFIX = "请基于以上讨论，使用 nano banana pro 生成学习漫画"; // The suffix "第x页..." is added dynamically