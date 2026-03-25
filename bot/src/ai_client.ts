// AI Client - Multi-model support with automatic retry
// Pipeline: [Request] -> [Model Selection] -> [API Call] -> [Retry] -> [Response]

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | any[];
}

interface ChatOptions {
  messages: ChatMessage[];
  max_tokens?: number;
  model?: keyof typeof MODELS;
  temperature?: number;
}

interface AIResponse {
  content: string;
  model?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

const MODELS = {
  intent:
    "google/gemini-2.0-flash-001, google/gemini-2.0-flash-lite-preview-02-05:free, anthropic/claude-3-haiku:free",
  vision:
    "openai/gpt-4o, google/gemini-2.0-flash-001, google/gemini-2.0-flash-lite-preview-02-05:free",
  chat: "anthropic/claude-3-haiku, google/gemini-2.0-flash-001, google/gemini-2.0-flash-lite-preview-02-05:free",
  rag: "google/gemini-2.0-flash-001, google/gemma-3-4b-it:free, google/gemini-2.0-flash-lite-preview-02-05:free",
};

const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callOpenRouter(
  options: ChatOptions,
  retries = MAX_RETRIES,
): Promise<AIResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OpenRouter API key not configured");
  }

  const modelKey = options.model || "chat";
  const modelList = MODELS[modelKey].split(",").map((m) => m.trim());

  console.log(`[DEBUG: AI_CLIENT] Calling model category: ${modelKey}`);

  for (const model of modelList) {
    console.log(`[DEBUG: AI_CLIENT] Attempting model: ${model}`);
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://phomenu.bot",
              "X-Title": "PhoMenu Bot",
            },
            body: JSON.stringify({
              model,
              messages: options.messages,
              max_tokens: options.max_tokens || 500,
              temperature: options.temperature || 0.7,
              response_format: { type: "json_object" },
            }),
          },
        );

        if (!response.ok) {
          const error = await response.text();
          console.error(
            `[DEBUG: AI_CLIENT] API error (model ${model}, attempt ${attempt}): ${error}`,
          );
          if (attempt < retries && response.status >= 500) {
            await sleep(RETRY_DELAY * attempt);
            continue;
          }
          break; // Try next model
        }

        const data: any = await response.json();
        const content = data.choices?.[0]?.message?.content || "";

        console.log(
          `[DEBUG: AI_CLIENT] Success with ${model}, tokens: ${data.usage?.total_tokens || "N/A"}`,
        );

        return {
          content,
          model: data.model,
          usage: data.usage,
        };
      } catch (error) {
        console.error(
          `[DEBUG: AI_CLIENT] Attempt ${attempt} failed for ${model}:`,
          error,
        );
        if (attempt >= retries) break;
        await sleep(RETRY_DELAY * attempt);
      }
    }
  }

  throw new Error("All models failed or max retries exceeded");
}

export async function chat(options: ChatOptions): Promise<AIResponse> {
  return callOpenRouter(options);
}

export interface IntentResult {
  intent: "INFO" | "ORDER" | "OFF_TOPIC";
  name_vi: string[];
  sql_filter: string[];
  preferences: string[];
  exclude: string[];
  spice_level: number;
  use_context: boolean;
  language_detected: string;
  confidence: number;
}

export async function classifyIntent(text: string): Promise<IntentResult> {
  console.log(`[DEBUG: INTENT_CLASSIFIER] Input: "${text}"`);

  try {
    const response = await callOpenRouter({
      messages: [
        {
          role: "system",
          content: `You are a high-level intent classifier for the PhoMenu AI assistant.
          Your task is to analyze user input and prepare structured data for searching or sorting.

          CATEGORIES AND LOGIC:

          1. INFO: Questions about Vietnamese cuisine, ingredients, or history only.
          name_vi: If a specific dish is recognized (e.g., "tell me about Pho Bo"),
          return the canonical name: "Pho Bo."

          If the query is, for example, "rice porridge," we include all canonical names of dishes related to rice porridge. Dishes must contain a specific name of two or more words.
          sql_filter: If the user describes a dish (e.g., "porridge with pork"),
          you MUST translate the key ingredients into Vietnamese for the SQL LIKE pattern. Example: "rice porridge."

          ["cháo", "heo", "thịt"]
          Exclude: If the user describes a dish as pork-free or pork-free, translate the ingredients into Vietnamese. Example: "pork-free rice porridge" ["heo"]

          2. ORDER: Intent to make a purchase, call a waiter, or order a previously recognized dish/menu.

          - Keywords: "order", "waiter", "number", "second", "third" in any language.

          - If the user refers to a previous view (e.g., "order a second" in any language), set use_context: true.

          3. OFF-TOPIC: Anything not related to Vietnamese cuisine.

          PREFERENCES (common waiter phrases)

          RULES:

          - Always use canonical Vietnamese names for name_vi if known.

          - exclude: ingredients the user wishes to exclude.
          - spice_level: spiciness level. By default, the maximum spiciness is 5. For a request for "not spicy," it is reduced to 3. For a request for "no spices at all," it is reduced to 1.

          - language_detected: "ru", "en", "vi", "kk", "uz", "de", "fr"

          Only respond with valid JSON:

          "intent": "INFO|ORDER|OFF_TOPIC",
          "name_vi": ["Phở Bò", ""] or [],
          "sql_filter": ['cháo', 'heo'] or [],
          "preferences": ["sugar-free", "low spicy"] or [],
          "exclude": ["heo"] or [],
          "spice_level": 5,
          "use_context": true|false,
          "language_detected": "ru|en|vi|kk|uz|de|fr",
          "confidence": 0.0-1.0

          }`,
        },
        { role: "user", content: text },
      ],
      max_tokens: 200,
      model: "intent",
    });

    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      console.log(
        `[DEBUG: INTENT_CLASSIFIER] Result: intent=${result.intent}, name_vi=${result.name_vi || "null"}, sql_filter=${result.sql_filter || "null"}, use_context=${result.use_context}`,
      );
      return {
        intent: result.intent || "OFF_TOPIC",
        name_vi: result.name_vi || [],
        sql_filter: result.sql_filter || [],
        preferences: result.preferences || [],
        exclude: result.exclude || [],
        spice_level: result.spice_level || 5,
        use_context: result.use_context || false,
        language_detected: result.language_detected || "ru",
        confidence: result.confidence || 0.5,
      };
    }
  } catch (e) {
    console.error(`[DEBUG: INTENT_CLASSIFIER] Error: ${e}`);
  }

  console.log(`[DEBUG: INTENT_CLASSIFIER] Fallback to INFO`);
  return {
    intent: "OFF_TOPIC",
    name_vi: [],
    sql_filter: [],
    preferences: [],
    exclude: [],
    use_context: false,
    language_detected: "ru",
    confidence: 0.3,
  };
}

export async function analyzePhoto(
  imageUrl: string,
  base64Data?: string,
): Promise<{
  dish?: string;
  list?: string[];
  description?: string;
  is_menu?: boolean;
}> {
  console.log(`[DEBUG: VISION_PIPELINE] Analyzing photo`);

  try {
    const userContent: any[] = [
      {
        type: "text",
        text: `Identify any Vietnamese dishes in this image. You are an expert on Vietnamese cuisine and dishes. You can identify a dish from a photo, regardless of lighting or angle. If you can't identify a dish, suggest similar dishes.
        If this is a menu with multiple dishes, return a list of dish names in Vietnamese of 2 or more words. If this is a single dish, return the name of this dish in Vietnamese of 2 or more words. If this is not Vietnamese food, return an empty list.
        In the description, display what you see in the language.
        Answer ONLY in JSON format: {"list": ["dish1", "dish2"], "description": "what you see", "is_menu": true/false}`,
      },
    ];

    if (base64Data) {
      userContent.push({
        type: "image_url",
        image_url: {
          url: `data:image/jpeg;base64,${base64Data}`,
        },
      });
    } else {
      userContent.push({
        type: "image_url",
        image_url: {
          url: imageUrl,
        },
      });
    }

    const response = await callOpenRouter({
      messages: [
        {
          role: "system",
          content: "You are a Vietnamese food expert.",
        },
        {
          role: "user",
          content: userContent,
        },
      ],
      max_tokens: 300,
      model: "vision",
    });

    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      console.log(`[DEBUG: VISION_PIPELINE] Found: ${JSON.stringify(result)}`);
      return {
        dish: result.list?.[0] || result.dish,
        list: result.list,
        description: result.description,
        is_menu: result.is_menu,
      };
    }
  } catch (e) {
    console.error(`[DEBUG: VISION_PIPELINE] Error: ${e}`);
  }

  return { description: "Could not analyze image" };
}

export async function generateWikiDish(nameVi: string): Promise<{
  description: any;
  warnings: any;
  allergens: any;
  spice_level: number;
  search_tags: string[];
  price_range: string;
  image_urls: string[];
}> {
  console.log(`[DEBUG: DISCOVERY_MODE] Generating wiki data for: ${nameVi}`);

  try {
    const response = await callOpenRouter({
      messages: [
        {
          role: "system",
          content: `You are a Vietnamese cuisine expert.
          GUIDELINES FOR CONTENT description:
          1. Research & Synthesis: Base the core facts on Wikipedia data (history, origin, traditional cooking methods).
          2. Tone: Write the "description" from the perspective of an enthusiastic gourmet traveler who has just discovered this dish in a hidden alley of Hanoi or Saigon. Use evocative, sensory language (aroma, texture, visual appeal).
          3. Warnings: Include a "warnings" section within the description or as a separate key. Mention specific properties: high spice levels, presence of common allergens (peanuts, shellfish), strong scents (shrimp paste, durian), or high fat content.
          4. Completeness: Ensure the ingredients list is authentic to the original Vietnamese recipe.
          5. Search Tags: Include a "search_tags" key with a comma-separated list of keywords that describe this dish well.
          6. Price Range: Include a "price_range" key with the price range of this dish in Vietnamese currency.
Generate dish info in EXACT JSON format:
{
  "description": {
    "vi": "Phở Bò - Vietnamese name in Vietnamese with description",
    "ru": "Фо Бо - Vietnamese dish with rich broth, description",
    "en": "Pho Bo - Traditional Vietnamese beef noodle soup",
    "kk": "Фо Бо - Вьетнамдық сиыр сорпасы",
    "uz": "Phở Bò - Vetnam oshi",
    "de": "Pho Bo - Traditionelle vietnamesische Rindernudelsuppe",
    "fr": "Pho Bo - Soupe de nouilles au boeuf vietnamienne"
  },
  "warnings": {
    "vi": ["cay", "đậu phộng"],
    "ru": ["острое", "арахис"],
    "en": ["spicy", "peanuts"],
    "kk": ["ашық"],
    "de": ["scharf"]
  },
  "allergens": {
    "vi": ["đậu phộng"],
    "ru": ["арахис"],
    "en": ["peanuts"]
  },
  "search_tags": "cơm,bò",
  "spice_level": 1-5,
  "price_range": "150-300 VND",
  "image_urls": ["https://example.com/dish.jpg"]
}

RULES:
- description: JSON with language keys, VALUE starts with translated name followed by " - " and description
- warnings: JSON with language keys, VALUE is array of warning strings
- allergens: JSON with language keys, VALUE is array of allergen strings
- spice_level: INTEGER 1-5 (1=not spicy, 5=very spicy)
- price_range: string like "150-300 RUB"
- image_urls: array of image URLs or empty array`,
        },
        {
          role: "user",
          content: `Generate dish info for: "${nameVi}"`,
        },
      ],
      max_tokens: 800,
      model: "chat",
    });

    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      console.log(`[DEBUG: DISCOVERY_MODE] Generated data for ${nameVi}`);
      return {
        description: data.description || { vi: nameVi },
        warnings: data.warnings || {},
        allergens: data.allergens || {},
        spice_level: data.spice_level || 1,
        search_tags: data.search_tags || [],
        price_range: data.price_range || "",
        image_urls: data.image_urls || [],
      };
    }
  } catch (e) {
    console.error(`[DEBUG: DISCOVERY_MODE] Error: ${e}`);
  }

  return {
    description: { vi: nameVi },
    warnings: {},
    allergens: {},
    spice_level: 1,
    search_tags: [],
    price_range: "",
    image_urls: [],
  };
}

export async function generateOrderPhrase(
  userRequest: string,
  dishName: string | null,
  preferences: string[],
  ragPhrases: string[],
): Promise<{ vi: string; translated: string; phonetic: string }> {
  console.log(`[DEBUG: RAG_ORDER] Generating phrase for: ${userRequest}`);

  try {
    const response = await callOpenRouter({
      messages: [
        {
          role: "system",
          content: `Generate a polite Vietnamese phrase for the waiter.
User request: "${userRequest}"
Dish: ${dishName || "not specified"}
Preferences: ${preferences.join(", ") || "none"}
Helpful phrases: ${ragPhrases.join(" | ")}

Respond ONLY with valid JSON:
{"vi": "Vietnamese phrase", "translated": "English translation", "phonetic": "Pronunciation guide"}`,
        },
        { role: "user", content: userRequest },
      ],
      max_tokens: 200,
      model: "rag",
    });

    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      console.log(`[DEBUG: RAG_ORDER] Generated: ${result.vi}`);
      return result;
    }
  } catch (e) {
    console.error(`[DEBUG: RAG_ORDER] Error: ${e}`);
  }

  return { vi: "Xin lỗi", translated: "Sorry", phonetic: "Sin looe" };
}

export { MODELS };
