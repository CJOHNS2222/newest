import { GoogleGenAI, Type, Schema } from "@google/genai";
import { PantryItem, RecipeSearchResult, RecipeSearchParams, StructuredRecipe } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

/**
 * Analyzes an image to identify pantry items.
 */
export const analyzePantryImage = async (base64Image: string, mimeType: string): Promise<PantryItem[]> => {
  const modelId = "gemini-2.5-flash"; 

  const schema: Schema = {
    type: Type.ARRAY,
    description: "A comprehensive list of pantry items identified in the image.",
    items: {
      type: Type.OBJECT,
      properties: {
        item: {
          type: Type.STRING,
          description: "The specific name of the item.",
        },
        category: {
          type: Type.STRING,
          description: "The broad category.",
        },
        quantity_estimate: {
          type: Type.STRING,
          description: "Visual estimate of quantity.",
        },
      },
      required: ["item", "category", "quantity_estimate"],
    },
  };

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
          {
            text: "Analyze this image and provide a detailed inventory of the pantry items visible. Be precise with item names.",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No data returned from Gemini.");
    
    const cleanJson = jsonText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    return JSON.parse(cleanJson) as PantryItem[];

  } catch (error) {
    console.error("Error analyzing pantry image:", error);
    throw error;
  }
};

/**
 * Searches for recipes using Google Search Grounding with enhanced filters and structured JSON output.
 */
export const searchRecipes = async (params: RecipeSearchParams): Promise<RecipeSearchResult> => {
  const modelId = "gemini-2.5-flash";
  
  let prompt = "";

  if (params.query) {
    // Mode 1: Specific Search
    prompt = `Find exactly 3 detailed recipes for "${params.query}". `;
    if (params.restrictions) prompt += `Dietary restrictions: ${params.restrictions}. `;
  } else {
    // Mode 2: Generate from Pantry
    prompt = `Suggest exactly 3 creative recipes based on these available ingredients: ${params.ingredients}. `;
    
    if (params.strictMode) {
      prompt += `STRICT MODE: Only use the provided ingredients. You may assume simple pantry staples like oil, salt, pepper, and water, but DO NOT include recipes that require buying other significant ingredients. `;
    } else {
      prompt += `You may include recipes that use these ingredients but might require a few additional common items. `;
    }

    if (params.restrictions) prompt += `Dietary restrictions: ${params.restrictions}. `;
    if (params.maxCookTime) prompt += `Maximum cook time: ${params.maxCookTime} minutes. `;
    if (params.maxIngredients) prompt += `Maximum number of ingredients: ${params.maxIngredients}. `;
  }

  prompt += `Please use the ${params.measurementSystem} measurement system for all quantities. `;

  // Explicitly request JSON structure in the prompt since we cannot use responseSchema with tools
  prompt += `
  
  Provide the result strictly as a valid JSON object matching this structure:
  {
    "recipes": [
      {
        "title": "string",
        "description": "string",
        "ingredients": ["string (ingredient with quantity)"],
        "instructions": ["string (step by step)"],
        "cookTime": "string"
      }
    ]
  }
  Ensure the "recipes" array contains exactly 3 distinct recipes.
  Do not include any markdown formatting (like \`\`\`json). Just the raw JSON string.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        // responseMimeType: "application/json", // REMOVED due to incompatibility with tools
        // responseSchema: schema // REMOVED due to incompatibility with tools
      },
    });

    const jsonText = response.text;
    let recipes: StructuredRecipe[] = [];
    
    if (jsonText) {
        // Clean up markdown if present
        const cleanJson = jsonText.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "").trim();
        try {
            const parsed = JSON.parse(cleanJson);
            recipes = parsed.recipes || [];
        } catch (e) {
            console.error("JSON Parse Error:", e);
            console.log("Raw Text:", jsonText);
            // Attempt to recover or return empty
        }
    }

    return {
      recipes: recipes,
      groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks,
    };

  } catch (error) {
    console.error("Error searching recipes:", error);
    throw error;
  }
};