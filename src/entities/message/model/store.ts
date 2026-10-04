import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Message } from './types';

interface MessageState {
  messages: Record<string, Message[]>; // Словарь: chatId -> массив сообщений Message[]
  addMessage: (chatId: string, message: Message) => void;
  replaceMessageId: (chatId: string, oldId: string, newId: string) => void;
  setChatMessages: (chatId: string, messages: Message[]) => void;
  migrateChatMessages: (oldChatId: string, newChatId: string) => void;
  clearMessages: () => void;
}

// Zustand-хранилище для управления сообщениями всех чатов с сохранением в localStorage
export const useMessageStore = create<MessageState>()(
  persist(
    (set) => ({
      messages: {},
      addMessage: (chatId, message) =>
        set((state) => {
          const chatMessages = state.messages[chatId] || [];
          if (chatMessages.some((m) => String(m.id) === String(message.id))) {
            return state;
          }
          return {
            messages: {
              ...state.messages,
              [chatId]: [...chatMessages, message],
            },
          };
        }),
      replaceMessageId: (chatId, oldId, newId) =>
        set((state) => {
          const strOldId = String(oldId);
          let targetChatId = chatId;
          let chatMessages = targetChatId ? state.messages[targetChatId] : undefined;

          if (!chatMessages || !chatMessages.some((m) => String(m.id) === strOldId)) {
            const foundChatId = Object.keys(state.messages).find((cId) =>
              state.messages[cId].some((m) => String(m.id) === strOldId)
            );
            if (foundChatId) {
              targetChatId = foundChatId;
              chatMessages = state.messages[foundChatId];
            }
          }

          if (!chatMessages || !targetChatId) return state;

          return {
            messages: {
              ...state.messages,
              [targetChatId]: chatMessages.map((m) =>
                String(m.id) === strOldId ? { ...m, id: String(newId) } : m
              ),
            },
          };
        }),
      setChatMessages: (chatId, messages) =>
        set((state) => {
          const current = state.messages[chatId] || [];
          // Сохраняем локальные оптимистичные сообщения, которые еще не успели вернуться из getChatHistory
          const pendingOptimistic = current.filter(
            (m) => m.id.startsWith('out_') && !messages.some((serverMsg) => serverMsg.text === m.text)
          );

          return {
            messages: {
              ...state.messages,
              [chatId]: [...messages, ...pendingOptimistic],
            },
          };
        }),
      migrateChatMessages: (oldChatId, newChatId) =>
        set((state) => {
          if (!oldChatId || !newChatId || oldChatId === newChatId) return state;
          const oldMessages = state.messages[oldChatId] || [];
          const newMessages = state.messages[newChatId] || [];

          if (oldMessages.length === 0) return state;

          const existingIds = new Set(newMessages.map((m) => m.id));
          const merged = [
            ...newMessages,
            ...oldMessages
              .filter((m) => !existingIds.has(m.id))
              .map((m) => ({ ...m, chatId: newChatId })),
          ].sort((a, b) => a.timestamp - b.timestamp);

          const nextMessages = { ...state.messages };
          delete nextMessages[oldChatId];
          nextMessages[newChatId] = merged;

          return { messages: nextMessages };
        }),
      clearMessages: () => set({ messages: {} }),
    }),
    {
      name: 'max-messenger-messages',
    }
  )
);
