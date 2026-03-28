import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysis } from "../types";

const apiKey = process.env.GEMINI_API_KEY;
// The GoogleGenAI constructor requires a truthy apiKey or it will throw at runtime.
// We handle this by only initializing it if the key exists.
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const SYSTEM_PROMPT = `You are the core intelligence of "Arth-AI," a revolutionary Financial Literacy & Economic Forecasting platform. Your mission is to decode the hidden impact of the global economy on an individual's daily life.

Core Objective: When a user logs an expense or asks a question, you must analyze it through 5 specific lenses:
1. The Inflation Time Machine: Calculate what this exact expense would have cost in 2016 and what it will likely cost in 2036 (using a standard 6-7% annual inflation projection).
2. Macro-Micro Connection: Link the user's expense to a real-world economic factor (e.g., if they bought a burger, mention grain prices or fuel costs affecting logistics).
3. The Resilience Stress Test: Based on the user's profile or the expense size, calculate a "Financial Shield Score" (1-10). Tell them how many days of survival they lose or gain with this spending decision.
4. Economic Indicators: Identify 2-3 relevant real-world economic indicators (e.g., CPI, Interest Rates, Fuel Prices) that directly influence this expense category. Provide their current trend and impact.
5. Smart Move Advice: Give one professional, strategic tip to hedge against inflation for that specific category, including a specific actionable strategy.

Tone: Act like a high-level Financial Advisor who is also a supportive mentor.
Format: ALWAYS respond in structured JSON.`;

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    inflationTimeMachine: {
      type: Type.OBJECT,
      properties: {
        cost2016: { type: Type.NUMBER },
        cost2036: { type: Type.NUMBER },
        explanation: { type: Type.STRING },
      },
      required: ["cost2016", "cost2036", "explanation"],
    },
    macroMicroConnection: {
      type: Type.OBJECT,
      properties: {
        factor: { type: Type.STRING },
        description: { type: Type.STRING },
      },
      required: ["factor", "description"],
    },
    resilienceStressTest: {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.NUMBER },
        survivalImpact: { type: Type.STRING },
      },
      required: ["score", "survivalImpact"],
    },
    economicIndicators: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING },
          value: { type: Type.STRING },
          trend: { type: Type.STRING, enum: ["up", "down", "stable"] },
          impact: { type: Type.STRING },
        },
        required: ["label", "value", "trend", "impact"],
      },
    },
    smartMoveAdvice: {
      type: Type.OBJECT,
      properties: {
        tip: { type: Type.STRING },
        strategy: { type: Type.STRING },
        inflationHedge: { type: Type.STRING },
      },
      required: ["tip", "strategy", "inflationHedge"],
    },
  },
  required: ["inflationTimeMachine", "macroMicroConnection", "resilienceStressTest", "economicIndicators", "smartMoveAdvice"],
};

export async function analyzeExpense(
  amount: number, 
  category: string, 
  description: string,
  userProfile?: { income?: number, essentials?: number, customInflation?: number }
): Promise<AIAnalysis> {
  if (!ai) {
    throw new Error("Gemini API key is not configured. Please check your environment variables.");
  }
  const model = "gemini-3-flash-preview";
  
  const inflationContext = userProfile?.customInflation 
    ? `The user has provided a custom predicted annual inflation rate of ${userProfile.customInflation}%. Use this for the 2036 projection.`
    : `Use a standard 6-7% annual inflation projection for the 2036 calculation.`;

  const resilienceContext = (userProfile?.income && userProfile?.essentials)
    ? `The user's monthly income is $${userProfile.income} and essential expenses are $${userProfile.essentials}. Personalize the Resilience Stress Test based on their actual discretionary income.`
    : `The user's financial profile is incomplete. Estimate the Resilience Stress Test based on the expense size relative to average middle-class spending.`;

  const prompt = `Analyze this expense:
Amount: $${amount}
Category: ${category}
Description: ${description}

Context:
${inflationContext}
${resilienceContext}

Advanced Economic Modeling:
- Account for category-specific volatility (e.g., energy prices for transport, supply chain for groceries).
- Consider the impact of current global economic indicators if relevant to the category.`;

  const response = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: analysisSchema,
    },
  });

  return JSON.parse(response.text);
}

export async function getFinancialAdvice(message: string, history: { role: 'user' | 'ai', text: string }[]): Promise<string> {
  if (!ai) {
    return "I'm currently unable to provide financial advice as the Gemini AI is not configured. Please ensure your API key is set.";
  }
  const model = "gemini-3-flash-preview";
  const chat = ai.chats.create({
    model,
    config: {
      systemInstruction: "You are the Arth-AI Mentor. Provide professional, supportive, and strategic financial advice based on economic principles. Keep responses concise and engaging.",
    },
  });

  // Convert history to Gemini format
  const contents = history.map(h => ({
    role: h.role === 'ai' ? 'model' : 'user',
    parts: [{ text: h.text }]
  }));

  const response = await chat.sendMessage({ message });
  return response.text;
}
