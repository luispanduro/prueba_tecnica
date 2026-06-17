import { create } from 'zustand';
import { ChatMessage, AiQueryMetadata } from '../types/ai.types';
import { aiService } from '../services/ai.service';

interface AiStore {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  lastMetadata: AiQueryMetadata | null;
  sendQuery: (query: string) => Promise<void>;
  clearChat: () => void;
  clearError: () => void;
}

let msgId = 0;

export const useAiStore = create<AiStore>((set, get) => ({
  messages: [],
  isLoading: false,
  error: null,
  lastMetadata: null,

  sendQuery: async (query: string) => {
    const userMessage: ChatMessage = {
      id: `msg-${++msgId}`,
      role: 'user',
      content: query,
      timestamp: new Date().toISOString(),
    };

    set({ messages: [...get().messages, userMessage], isLoading: true, error: null });

    try {
      const response = await aiService.query({ query });

      const assistantMessage: ChatMessage = {
        id: `msg-${++msgId}`,
        role: 'assistant',
        content: response.answer,
        metadata: response.metadata,
        timestamp: new Date().toISOString(),
      };

      set({
        messages: [...get().messages, assistantMessage],
        isLoading: false,
        lastMetadata: response.metadata,
      });
    } catch (err: unknown) {
      const axErr = err as { response?: { status?: number; data?: { message?: string } } };
      const status = axErr.response?.status;
      let msg = axErr.response?.data?.message || 'Failed to get AI response';
      if (status === 429) msg = 'AI service is rate limited. Please try again later.';
      if (status === 503) msg = 'AI service is currently unavailable.';
      set({ error: msg, isLoading: false });
    }
  },

  clearChat: () => set({ messages: [], lastMetadata: null, error: null }),
  clearError: () => set({ error: null }),
}));
