
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getMathHint = async (problem: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `The user is stuck on this math problem: ${problem}. Provide a very short, encouraging hint WITHOUT giving away the final answer. Maximum 15 words.`,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text || "You can do this! Think about the operations step by step.";
  } catch (error) {
    console.error("Gemini Hint Error:", error);
    return "Believe in yourself! Try breaking it down.";
  }
};

export const getEncouragement = async (streak: number): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `A user just reached a streak of ${streak} in a math game. Write a short, exciting one-sentence congratulation message.`,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text || `Amazing! ${streak} correct answers!`;
  } catch (error) {
    return `Keep it up! Streak: ${streak}`;
  }
};
