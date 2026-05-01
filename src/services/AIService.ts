import { GoogleGenAI } from "@google/genai";
import { storage } from "./StorageService.ts";

const AI_STORAGE_KEY = 'grixchat_ai_messages';

export interface AIMessage {
  id: string;
  text: string;
  senderId: 'user' | 'ai';
  timestamp: number;
}

class AIService {
  private aiInstance: any | null = null;

  private get ai() {
    if (!this.aiInstance) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured in the environment.");
      }
      this.aiInstance = new GoogleGenAI({ apiKey });
    }
    return this.aiInstance;
  }

  getMessages(): AIMessage[] {
    const stored = storage.getItem(AI_STORAGE_KEY);
    if (!stored) {
      const initialMessage: AIMessage = {
        id: 'initial',
        text: 'Hello! I am Grix AI. How can I help you today?',
        senderId: 'ai',
        timestamp: Date.now()
      };
      this.saveMessages([initialMessage]);
      return [initialMessage];
    }
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Failed to parse AI messages:", e);
      return [];
    }
  }

  saveMessages(messages: AIMessage[]) {
    storage.setItem(AI_STORAGE_KEY, JSON.stringify(messages));
  }

  async sendMessage(text: string): Promise<string> {
    if (!process.env.GEMINI_API_KEY) {
      return "AI service is not configured. Please add GEMINI_API_KEY to your environment.";
    }

    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: text,
        config: {
          systemInstruction: "You are Grix AI, a helpful and friendly assistant for GrixChat users. Keep your responses concise and helpful.",
        }
      });
      return response.text || "I'm sorry, I couldn't process that.";
    } catch (error) {
      console.error("AI Error:", error);
      return "I'm having some trouble connecting right now. Please try again later.";
    }
  }

  clearMessages() {
    storage.removeItem(AI_STORAGE_KEY);
  }
}

export const aiService = new AIService();
