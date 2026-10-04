import { useQuery } from '@tanstack/react-query';
import { useSessionStore } from '@/entities/session';
import { useChatStore } from '@/entities/chat';
import { useMessageStore } from '../model/store';
import { greenApi, ChatHistoryMessage } from '@/shared/api';
import { Message } from '../model/types';

// хук для загрузки истории сообщений конкретного чата через TRQ
export function useChatHistoryQuery(chatId: string) {
  const session = useSessionStore();
  const setChatMessages = useMessageStore((s) => s.setChatMessages);
  const updateChatInfo = useChatStore((s) => s.updateChatInfo);
  const updateLastMessage = useChatStore((s) => s.updateLastMessage);

  // Хук TRQ для кэширования, управления жизненным циклом и загрузки данных истории чата
  return useQuery({
    queryKey: ['chatHistory', session.idInstance, chatId],
    queryFn: async ({ signal }) => {
      if (!session.idInstance || !session.apiTokenInstance || !chatId) return [];

      let targetChatId = chatId;
      // Если chatId состоит только из 11 цифр без @c.us, дополняем суффиксом @c.us
      if (/^\d{11}$/.test(targetChatId)) {
        targetChatId = `${targetChatId}@c.us`;
      }

      const history = await greenApi.getChatHistory(
        {
          idInstance: session.idInstance,
          apiTokenInstance: session.apiTokenInstance,
          apiUrl: session.apiUrl,
        },
        targetChatId,
        100,
        signal
      );

      // Преобразуем историю GREEN-API (по умолчанию отсортирована по убыванию даты) в хронологически возрастающем порядке
      const convertedMessages: Message[] = history
        .map((item: ChatHistoryMessage) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const rawItem = item as any;
          const text =
            item.textMessage ||
            item.extendedTextMessage?.text ||
            rawItem?.textMessageData?.textMessage ||
            rawItem?.messageData?.textMessageData?.textMessage ||
            rawItem?.body?.text ||
            item.caption ||
            rawItem?.text ||
            (item.typeMessage && item.typeMessage !== 'textMessage' ? `[${item.typeMessage}]` : '');

          return {
            id: String(item.idMessage),
            chatId: targetChatId,
            text,
            timestamp: (item.timestamp || Date.now() / 1000) * 1000,
            isOutgoing: item.type === 'outgoing',
          };
        })
        .filter((m) => Boolean(m.text))
        .reverse();

      if (convertedMessages.length > 0) {
        setChatMessages(targetChatId, convertedMessages);
        const lastMsg = convertedMessages[convertedMessages.length - 1];
        const timeString = new Date(lastMsg.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
        updateLastMessage(
          targetChatId,
          lastMsg.text,
          timeString,
          lastMsg.isOutgoing
        );

        // Если в истории есть настоящее имя контакта (например, Анна), сохраняем в карточку чата
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const contactItem = history.find((h: any) => h.senderName || h.senderContactName) as any;
        if (contactItem) {
          const resolvedName = contactItem.senderContactName || contactItem.senderName;
          if (resolvedName) {
            updateChatInfo(targetChatId, { name: resolvedName });
          }
        }
      }

      return convertedMessages;
    },
    enabled: Boolean(session.idInstance && session.apiTokenInstance && chatId),
    staleTime: 1000 * 60 * 5, // Кэш актуален 5 минут
    refetchOnWindowFocus: false, // Отключаем повторный запрос при смене фокуса окна, чтобы не превышать лимиты API
  });
}
