import { GoogleGenAI, Type, Schema } from "@google/genai";
import { PagePlan, ComicPage } from "../types";
import { TEXT_MODEL, IMAGE_MODEL, PROMPT_ANALYSIS, PROMPT_PLANNING, PROMPT_IMAGE_GENERATION_PREFIX } from "../constants";

const getAIClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * Step 1: Analyze the paper and get the main idea in Doraemon style.
 */
export const analyzePaper = async (fileBase64: string, mimeType: string): Promise<string> => {
  const ai = getAIClient();
  
  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: fileBase64
            }
          },
          { text: PROMPT_ANALYSIS }
        ]
      }
    });

    return response.text || "Failed to generate analysis.";
  } catch (error) {
    console.error("Analysis Error:", error);
    throw new Error("Failed to analyze the paper.");
  }
};

/**
 * Step 2: Plan the storybook pages.
 */
export const planStory = async (analysisContext: string): Promise<PagePlan[]> => {
  const ai = getAIClient();
  
  const schema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        pageNumber: { type: Type.INTEGER },
        description: { type: Type.STRING, description: "The narrative content of this page" },
        visualCue: { type: Type.STRING, description: "Description of the visual scene for the image generator" }
      },
      required: ["pageNumber", "description", "visualCue"]
    }
  };

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: {
        parts: [
          { text: `Context: ${analysisContext}` },
          { text: PROMPT_PLANNING }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      }
    });

    const text = response.text;
    if (!text) throw new Error("No plan generated");
    
    return JSON.parse(text) as PagePlan[];
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
  const ai = getAIClient();
  
  const prompt = `${PROMPT_IMAGE_GENERATION_PREFIX}第${pagePlan.pageNumber}页的图像（页面分辨率统一为竖屏 2:3，语言是中文）。
  
  Context: ${context}
  
  Page Description: ${pagePlan.description}
  Visual Scene: ${pagePlan.visualCue}`;

  try {
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
            // "2:3" is requested by user, but API typically supports 1:1, 3:4, 4:3, 9:16, 16:9.
            // 3:4 is the closest standard photography/comic ratio to 2:3.
            aspectRatio: "3:4", 
        }
      }
    });

    let imageUrl = '';
    
    // Iterate through parts to find the image
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break; 
        }
      }
    }

    if (!imageUrl) {
        // Fallback or error handling if no image is returned
        throw new Error(`No image generated for page ${pagePlan.pageNumber}`);
    }

    return {
      pageNumber: pagePlan.pageNumber,
      imageUrl: imageUrl,
      description: pagePlan.description
    };

  } catch (error) {
    console.error(`Image Generation Error (Page ${pagePlan.pageNumber}):`, error);
    throw error;
  }
};