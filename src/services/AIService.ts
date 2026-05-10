import Groq from "groq-sdk";
import { storage } from "./StorageService.ts";

const AI_STORAGE_KEY = 'grixchat_ai_messages';
const AI_MODEL_KEY = 'grixchat_ai_model';

export type AIModelType = 'grix-ai' | 'grix-ai-pro';

export interface AIMessage {
  id: string;
  text: string;
  senderId: 'user' | 'ai';
  timestamp: number;
}

class AIService {
  private groqInstance: Groq | null = null;
  private currentModel: AIModelType = 'grix-ai';

  constructor() {
    const savedModel = storage.getItem(AI_MODEL_KEY) as AIModelType;
    if (savedModel) this.currentModel = savedModel;
  }

  private get groq() {
    if (!this.groqInstance) {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY;
      if (!apiKey) {
        // Fallback for debugging, but will error if really used without key
        console.warn("GROQ_API_KEY is not configured.");
      }
      this.groqInstance = new Groq({ 
        apiKey: apiKey || "dummy_key",
        dangerouslyAllowBrowser: true 
      });
    }
    return this.groqInstance;
  }

  setModel(model: AIModelType) {
    this.currentModel = model;
    storage.setItem(AI_MODEL_KEY, model);
  }

  getCurrentModel(): AIModelType {
    return this.currentModel;
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
    const apiKey = import.meta.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY;
    if (!apiKey) {
      return "Groq API key is not configured. Please add VITE_GROQ_API_KEY to your environment.";
    }

    const modelId = this.currentModel === 'grix-ai-pro' 
      ? "llama-3.3-70b-versatile" 
      : "llama-3.1-70b-versatile";

    try {
      const chatCompletion = await this.groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are ${this.currentModel === 'grix-ai-pro' ? 'Grix AI Pro' : 'Grix AI'}, a helpful and friendly assistant for GrixChat users. Keep your responses concise, professional and useful. Experience real-time chat, HD reels, and private communication powered by Grix Group. Member of Grix Group India.`
          },
          {
            role: "user",
            content: text,
          },
        ],
        model: modelId,
      });

      return chatCompletion.choices[0]?.message?.content || "I'm sorry, I couldn't process that.";
    } catch (error) {
      console.error("Groq AI Error:", error);
      return "I'm having some trouble connecting to Groq. Please verify your API key and try again later.";
    }
  }

  clearMessages() {
    storage.removeItem(AI_STORAGE_KEY);
  }
}

export const aiService = new AIService();
