import { useEffect, useRef } from 'react';
import { useSessionStore } from '@/entities/session';
import { useChatStore } from '@/entities/chat';
import { useMessageStore } from '@/entities/message';
import { greenApi, cancellableDelay } from '@/shared/api';
import { formatRussianPhone } from '@/shared/lib/phone';

// Кэш проверенных инстансов в рамках сессии приложения, чтобы не вызывать getSettings повторно
const configuredInstances = new Set<string>();

/**
 * Вспомогательная функция сопоставления номеров телефонов
 */
function matchesPhone(p1?: string, p2?: string): boolean {
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

/**
 * Извлечение читаемого текста сообщения из структуры GREEN-API / MAX
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractMessageText(messageData: any): string {
  if (!messageData) return '';

  const text =
    messageData?.textMessageData?.textMessage ||
    messageData?.extendedTextMessageData?.text ||
    messageData?.quotedMessage?.textMessage ||
    messageData?.quotedMessage?.extendedTextMessageData?.text ||
    messageData?.fileMessageData?.caption ||
    messageData?.text ||
    messageData?.caption;

  if (text && typeof text === 'string' && text.trim()) {
    return text.trim();
  }

  const type = messageData?.typeMessage;
  if (!type) return '';

  switch (type) {
    case 'textMessage':
      return '';
    case 'imageMessage':
      return messageData?.fileMessageData?.caption || messageData?.imageMessageData?.caption || '[Изображение]';
    case 'videoMessage':
      return messageData?.fileMessageData?.caption || messageData?.videoMessageData?.caption || '[Видео]';
    case 'documentMessage':
      return messageData?.fileMessageData?.fileName || messageData?.documentMessageData?.fileName || '[Документ]';
    case 'audioMessage':
      return '[Голосовое сообщение]';
    case 'stickerMessage':
      return '[Стикер]';
    case 'reactionMessage':
      return messageData?.reactionMessageData?.reaction || '[Реакция]';
    case 'contactMessage':
      return '[Контакт]';
    case 'locationMessage':
      return '[Геолокация]';
    default:
      return `[${type}]`;
  }
}

/**
 * Хук useNotificationPolling для получения сообщений через HTTP API GREEN-API
 * (receiveNotification -> обработка входящего сообщения -> deleteNotification)
 * в соответствии с инструкцией: https://green-api.com/v3/docs/api/receiving/technology-http-api/
 */
export function useNotificationPolling() {
  const isAuth = useSessionStore((s) => s.isAuth);
  const idInstance = useSessionStore((s) => s.idInstance);
  const apiTokenInstance = useSessionStore((s) => s.apiTokenInstance);
  const apiUrl = useSessionStore((s) => s.apiUrl);

  const addMessage = useMessageStore((s) => s.addMessage);
  const migrateChatMessages = useMessageStore((s) => s.migrateChatMessages);

  const addChat = useChatStore((s) => s.addChat);
  const updateChatId = useChatStore((s) => s.updateChatId);
  const updateLastMessage = useChatStore((s) => s.updateLastMessage);

  const isPollingRef = useRef(false);

  useEffect(() => {
    if (!isAuth || !idInstance || !apiTokenInstance) {
      return;
    }

    const abortController = new AbortController();
    isPollingRef.current = true;

    const run = async () => {
      // 1. Проверяем настройки инстанса (только один раз за сессию для инстанса):
      // webhookUrl должен быть пустым, а incomingWebhook включен
      if (!configuredInstances.has(idInstance)) {
        try {
          const settings = await greenApi.getSettings(
            {
              idInstance,
              apiTokenInstance,
              apiUrl,
            },
            abortController.signal
          );

          const needUpdate =
            Boolean(settings.webhookUrl && settings.webhookUrl.trim() !== '') ||
            settings.incomingWebhook !== 'yes';

          if (needUpdate) {
            console.log('[GREEN-API] Обновляем настройки инстанса для очереди HTTP API...');
            await greenApi.setSettings(
              { idInstance, apiTokenInstance, apiUrl },
              {
                webhookUrl: '',
                incomingWebhook: 'yes',
                outgoingWebhook: 'yes',
                stateWebhook: 'yes',
              },
              abortController.signal
            );
          }
          configuredInstances.add(idInstance);
        } catch (err) {
          if (abortController.signal.aborted) return;
          console.warn('[GREEN-API] Проверка настроек инстанса завершилась предупреждением:', err);
        }
      }

      console.log('[GREEN-API] Запущен цикл получения сообщений через HTTP API...');

      // 2. Цикл получения уведомлений (receiveNotification -> обработка -> deleteNotification)
      while (isPollingRef.current && !abortController.signal.aborted) {
        try {
          const notification = await greenApi.receiveNotification(
            {
              idInstance,
              apiTokenInstance,
              apiUrl,
            },
            5,
            abortController.signal
          );

          if (!notification) {
            // Очередь пуста или истек таймаут long polling: пауза перед следующим запросом
            await cancellableDelay(1200, abortController.signal);
            continue;
          }

          const { receiptId, body } = notification;

          try {
            // Обработка входящего сообщения от собеседника
            if (body.typeWebhook === 'incomingMessageReceived') {
              const rawChatId = body.senderData?.chatId || body.chatId || '';
              const senderPhone = body.senderData?.senderPhoneNumber
                ? String(body.senderData.senderPhoneNumber)
                : '';

              const senderName =
                body.senderData?.senderContactName ||
                body.senderData?.senderName ||
                body.senderData?.chatName ||
                (senderPhone
                  ? formatRussianPhone(senderPhone).formatted
                  : rawChatId.replace('@c.us', ''));

              const text = extractMessageText(body.messageData);

              if (rawChatId && text) {
                const timestamp = body.timestamp ? body.timestamp * 1000 : Date.now();
                const timeString = new Date(timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                // Поиск существующего чата
                const currentChats = useChatStore.getState().chats;
                const matchedChat = currentChats.find((c) => {
                  if (c.id === rawChatId) return true;
                  if (senderPhone && (matchesPhone(c.phoneNumber, senderPhone) || matchesPhone(c.id, senderPhone))) {
                    return true;
                  }
                  if (matchesPhone(c.phoneNumber, rawChatId) || matchesPhone(c.id, rawChatId)) {
                    return true;
                  }
                  return false;
                });

                const targetChat = matchedChat || (currentChats.length === 1 ? currentChats[0] : null);

                if (targetChat) {
                  if (targetChat.id !== rawChatId) {
                    updateChatId(targetChat.id, rawChatId);
                    migrateChatMessages(targetChat.id, rawChatId);
                  }
                } else {
                  const phoneFormatted = senderPhone
                    ? formatRussianPhone(senderPhone).formatted
                    : rawChatId.replace('@c.us', '');

                  addChat({
                    id: rawChatId,
                    phoneNumber: phoneFormatted,
                    name: senderName,
                    lastMessage: text,
                    lastMessageTime: timeString,
                    isLastMessageOutgoing: false,
                  });
                }

                // Добавление сообщения в список чата
                addMessage(rawChatId, {
                  id: String(body.idMessage || Date.now()),
                  chatId: rawChatId,
                  text,
                  timestamp,
                  isOutgoing: false,
                });

                updateLastMessage(rawChatId, text, timeString, false);
              }
            } else if (body.typeWebhook === 'outgoingMessageReceived') {
              // Исходящее сообщение, отправленное с другого устройства / приложения
              const rawChatId = body.senderData?.chatId || body.chatId || '';
              const text = extractMessageText(body.messageData);

              if (rawChatId && text) {
                const timestamp = body.timestamp ? body.timestamp * 1000 : Date.now();
                const timeString = new Date(timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                addMessage(rawChatId, {
                  id: String(body.idMessage || Date.now()),
                  chatId: rawChatId,
                  text,
                  timestamp,
                  isOutgoing: true,
                });

                updateLastMessage(rawChatId, text, timeString, true);
              }
            }
          } finally {
            // Подтверждение и удаление обработанного уведомления из очереди (FIFO)
            if (receiptId) {
              await greenApi.deleteNotification(
                {
                  idInstance,
                  apiTokenInstance,
                  apiUrl,
                },
                receiptId,
                abortController.signal
              ).catch((err) => {
                console.warn('[GREEN-API] Не удалось удалить уведомление:', receiptId, err);
              });
            }
            // Небольшая задержка перед следующим запросом receiveNotification, чтобы не перегружать API
            await cancellableDelay(500, abortController.signal).catch(() => {});
          }
        } catch (err: unknown) {
          if (
            abortController.signal.aborted ||
            (err instanceof Error && err.name === 'AbortError')
          ) {
            break;
          }
          console.error('[GREEN-API] Ошибка при получении сообщений из очереди:', err);
          await cancellableDelay(3000, abortController.signal).catch(() => {});
        }
      }
    };

    run();

    return () => {
      isPollingRef.current = false;
      abortController.abort();
    };
  }, [
    isAuth,
    idInstance,
    apiTokenInstance,
    apiUrl,
    addMessage,
    migrateChatMessages,
    addChat,
    updateChatId,
    updateLastMessage,
  ]);
}
