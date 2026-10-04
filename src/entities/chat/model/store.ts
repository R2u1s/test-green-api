import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Chat } from './types';

function matchesChatId(id1?: string, id2?: string): boolean {
  if (!id1 || !id2) return false;
  if (id1 === id2) return true;
  const c1 = id1.replace(/\D/g, '');
  const c2 = id2.replace(/\D/g, '');
  if (!c1 || !c2) return false;
  if (c1 === c2) return true;
  // Сравнение последних 10 цифр для номеров телефонов (+79... и 89...)
  if (c1.length >= 10 && c2.length >= 10 && c1.slice(-10) === c2.slice(-10)) {
    return true;
  }
  return false;
}

function matchesChatPhone(p1?: string, p2?: string): boolean {
  if (!p1 || !p2) return false;
  const d1 = p1.replace(/\D/g, '');
  const d2 = p2.replace(/\D/g, '');
  if (!d1 || !d2) return false;
  if (d1 === d2) return true;
  if (d1.length >= 10 && d2.length >= 10 && d1.slice(-10) === d2.slice(-10)) {
    return true;
  }
  return false;
}

interface ChatState {
  chats: Chat[];
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
  addChat: (chat: Chat) => void;
  deleteChat: (chatId: string) => void;
  updateChatId: (oldId: string, newId: string) => void;
  updateChatInfo: (chatId: string, partial: Partial<Chat>) => void;
  updateLastMessage: (
    chatId: string,
    text: string,
    time: string,
    isOutgoing?: boolean
  ) => void;
  clearChats: () => void;
}

// Zustand-хранилище для управления списком диалогов,
// активным выбранным чатом, превью и временем последних сообщений с сохранением в localStorage
export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      chats: [],
      activeChatId: null,
      setActiveChatId: (id) => set({ activeChatId: id }),
      addChat: (newChat) =>
        set((state) => {
          const existing = state.chats.find(
            (c) =>
              matchesChatId(c.id, newChat.id) ||
              matchesChatPhone(c.phoneNumber, newChat.phoneNumber) ||
              matchesChatId(c.id, newChat.phoneNumber) ||
              matchesChatId(newChat.id, c.phoneNumber)
          );

          if (existing) {
            // Если у существующего чата был временный ID (например, телефон@c.us), а пришел настоящий chatId (например, MAX ID)
            const targetId = newChat.id || existing.id;
            return {
              chats: state.chats.map((c) =>
                c.id === existing.id ? { ...c, ...newChat, id: targetId } : c
              ),
              activeChatId: state.activeChatId === existing.id ? targetId : state.activeChatId || targetId,
            };
          }
          return {
            chats: [newChat, ...state.chats],
            activeChatId: state.activeChatId || newChat.id,
          };
        }),
      updateChatId: (oldId, newId) =>
        set((state) => {
          if (oldId === newId) return state;
          const existingTarget = state.chats.find((c) => c.id === newId);
          let updatedChats: Chat[];
          if (existingTarget) {
            updatedChats = state.chats.filter((c) => c.id !== oldId);
          } else {
            updatedChats = state.chats.map((c) => (c.id === oldId ? { ...c, id: newId } : c));
          }
          return {
            chats: updatedChats,
            activeChatId: state.activeChatId === oldId ? newId : state.activeChatId,
          };
        }),
      updateChatInfo: (chatId, partial) =>
        set((state) => ({
          chats: state.chats.map((chat) =>
            matchesChatId(chat.id, chatId) || matchesChatPhone(chat.phoneNumber, chatId)
              ? { ...chat, ...partial }
              : chat
          ),
        })),
      updateLastMessage: (chatId, text, time, isOutgoing) =>
        set((state) => ({
          chats: state.chats.map((chat) =>
            matchesChatId(chat.id, chatId) || matchesChatPhone(chat.phoneNumber, chatId)
              ? {
                  ...chat,
                  lastMessage: text,
                  lastMessageTime: time,
                  ...(isOutgoing !== undefined ? { isLastMessageOutgoing: isOutgoing } : {}),
                }
              : chat
          ),
        })),
      clearChats: () => set({ chats: [], activeChatId: null }),
      deleteChat: (chatId) =>
        set((state) => ({
          chats: state.chats.filter((c) => c.id !== chatId),
          activeChatId: state.activeChatId === chatId ? null : state.activeChatId,
        })),
    }),
    {
      name: 'max-messenger-chats',
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Автоматическая коррекция chatId: если в localStorage сохранился числовой id вместо @c.us
        state.chats = state.chats.map((chat) => {
          if (!chat.id.includes('@') && chat.phoneNumber) {
            const cleanDigits = chat.phoneNumber.replace(/\D/g, '');
            if (cleanDigits.length >= 11) {
              const formattedPhone = cleanDigits.startsWith('8')
                ? '7' + cleanDigits.slice(1)
                : cleanDigits;
              return { ...chat, id: `${formattedPhone}@c.us` };
            }
          }
          return chat;
        });
        if (state.activeChatId && !state.activeChatId.includes('@')) {
          const matching = state.chats.find((c) => matchesChatId(c.id, state.activeChatId!));
          if (matching) {
            state.activeChatId = matching.id;
          }
        }
      },
    }
  )
);
