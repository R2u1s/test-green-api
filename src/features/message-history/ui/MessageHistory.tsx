import React, { useCallback, useRef, useEffect } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { useMessageStore, Message, MessageBubble, useChatHistoryQuery } from '@/entities/message';

interface MessageHistoryProps {
  chatId: string;
}

const EMPTY_MESSAGES: Message[] = [];

// Небольшой футер, обеспечивающий эстетичный отступ внизу списка сообщений перед строкой ввода
const MessageListFooter: React.FC = () => <Box sx={{ height: 8 }} />;

export const MessageHistory: React.FC<MessageHistoryProps> = ({ chatId }) => {
  // Хранение ссылки на виртуализированный компонент Virtuoso и вызова скролла
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  // Атомарная подписка: компонент ререндерится только тогда, когда меняются сообщения для этого конкретного chatId
  // Хук для получения сообщений выбранного чата
  const messages = useMessageStore(
    useCallback((state) => state.messages[chatId] || EMPTY_MESSAGES, [chatId])
  );

  // Загрузка истории сообщений чата
  const { isLoading: isHistoryLoading } = useChatHistoryQuery(chatId);

  // Отслеживание предыдущей длины списка сообщений для разделения начальной загрузки и добавления новых сообщений
  const prevLengthRef = useRef(messages.length);
  const isFirstLoadRef = useRef(true);

  // Сброс флага первой загрузки при смене активного чата
  useEffect(() => {
    isFirstLoadRef.current = true;
    prevLengthRef.current = messages.length;
  }, [chatId]);

  // Первоначальное гарантированное выравнивание списка в самый низ при первом открытии чата
  useEffect(() => {
    if (isFirstLoadRef.current && messages.length > 0) {
      isFirstLoadRef.current = false;
      const timer = setTimeout(() => {
        virtuosoRef.current?.scrollToIndex({
          index: messages.length - 1,
          align: 'end',
          behavior: 'auto',
        });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [chatId, messages.length]);

  // Автоматическая прокрутка Virtuoso вниз:
  // - 'auto' для мгновенной загрузки истории или смены чата;
  // - 'smooth' для плавного скролла при отправке пользователем или получении входящего сообщения.
  const handleFollowOutput = useCallback(
    (_isAtBottom: boolean) => {
      const prevLength = prevLengthRef.current;
      // Если это начальная массовая загрузка истории (разница > 2)
      if (prevLength === 0 || messages.length - prevLength > 2) {
        return 'auto';
      }
      return 'smooth';
    },
    [messages.length]
  );

  // Обновление сохраненной длины списка после рендера
  useEffect(() => {
    prevLengthRef.current = messages.length;
  }, [messages.length]);

  if (isHistoryLoading && messages.length === 0) {
    return (
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#8E949D',
        }}
      >
        <CircularProgress size={32} sx={{ color: '#0077FF', mb: 2 }} />
        <Typography variant="body2" sx={{ color: '#8E949D' }}>
          Загрузка истории сообщений...
        </Typography>
      </Box>
    );
  }

  if (messages.length === 0) {
    return (
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#8E949D',
          px: 3,
          textAlign: 'center',
        }}
      >
        <Typography variant="body1" sx={{ color: '#8E949D', mb: 1 }}>
          Сообщений пока нет
        </Typography>
        <Typography variant="body2" sx={{ color: '#B0B5BD', maxWidth: 320 }}>
          Напишите первое сообщение собеседнику, используя поле ввода ниже
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', width: '100%', px: { xs: 1.5, sm: 3 } }}>
      <Virtuoso
        ref={virtuosoRef}
        data={messages}
        computeItemKey={(_index, message) => message.id}
        initialTopMostItemIndex={messages.length > 0 ? messages.length - 1 : 0}
        followOutput={handleFollowOutput}
        alignToBottom
        atBottomThreshold={60}
        increaseViewportBy={{ top: 0, bottom: 200 }}
        components={{ Footer: MessageListFooter }}
        itemContent={(_index, message) => <MessageBubble key={message.id} message={message} />}
        style={{ height: '100%', width: '100%' }}
      />
    </Box>
  );
};
