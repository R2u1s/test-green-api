import { useMutation } from '@tanstack/react-query';
import { useSessionStore } from '@/entities/session';
import { useMessageStore } from '../model/store';
import { greenApi } from '@/shared/api';

export interface SendMessageParams {
  chatId: string;
  messageText: string;
  tempId: string;
}

// Хук useSendMessageMutation для отправки сообщения в GREEN-API через TRQ
export function useSendMessageMutation() {
  const session = useSessionStore();
  const replaceMessageId = useMessageStore((s) => s.replaceMessageId);

  // Хук TRQ для выполнения асинхронного POST-запроса sendMessage
  return useMutation({
    mutationFn: async ({ chatId, messageText, tempId }: SendMessageParams) => {
      let targetChatId = chatId;
      if (/^\d{11}$/.test(targetChatId)) {
        targetChatId = `${targetChatId}@c.us`;
      }
      const response = await greenApi.sendMessage(
        {
          idInstance: session.idInstance,
          apiTokenInstance: session.apiTokenInstance,
          apiUrl: session.apiUrl,
        },
        {
          chatId: targetChatId,
          message: messageText,
        }
      );
      return { response, chatId: targetChatId, tempId };
    },
    onSuccess: ({ response, chatId, tempId }) => {
      if (response?.idMessage) {
        replaceMessageId(chatId, tempId, response.idMessage);
      }
    },
    onError: (err) => {
      console.error('[GREEN-API] Ошибка отправки сообщения:', err);
    },
  });
}
