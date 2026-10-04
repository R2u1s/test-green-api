import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SessionState {
  idInstance: string;
  apiTokenInstance: string;
  apiUrl: string;
  isAuth: boolean;
  login: (idInstance: string, apiTokenInstance: string, apiUrl?: string) => void;
  logout: () => void;
}

// Zustand-хранилище для управления состоянием сессии пользователя,
// сохранения учетных данных GREEN-API (idInstance, apiTokenInstance, apiUrl) и флага авторизации в localStorage
export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      idInstance: '',
      apiTokenInstance: '',
      apiUrl: 'https://api.greenapi.com',
      isAuth: false,
      login: (idInstance: string, apiTokenInstance: string, apiUrl?: string) => {
        set({
          idInstance: idInstance.trim(),
          apiTokenInstance: apiTokenInstance.trim(),
          apiUrl: (apiUrl && apiUrl.trim()) || 'https://api.greenapi.com',
          isAuth: true,
        });
      },
      logout: () => {
        set({
          idInstance: '',
          apiTokenInstance: '',
          apiUrl: 'https://api.greenapi.com',
          isAuth: false,
        });
        localStorage.removeItem('max-messenger-session');
      },
    }),
    {
      name: 'max-messenger-session',
    }
  )
);
