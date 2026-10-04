import React from 'react';
import { Box } from '@mui/material';
import { ChatSidebar } from '@/widgets/chat-sidebar';
import { ChatWindow, ChatHeaderInfo } from '@/widgets/chat-window';
import { MessageHistory } from '@/features/message-history';
import { SendMessageBar } from '@/features/send-message';
import { useNotificationPolling } from '@/features/receive-notifications';
import { useChatStore } from '@/entities/chat';

export const ChatPage: React.FC = () => {
  // Получение сообщений от собеседника через очередь HTTP API
  useNotificationPolling();

  // Хук подписки только на activeChatId для переключения правого экрана чата
  const activeChatId = useChatStore((s) => s.activeChatId);

  return (
    <Box
      sx={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        bgcolor: '#FFFFFF',
        overflow: 'hidden',
      }}
    >
      {/* Левая панель: список диалогов, поиск и кнопок управления */}
      <ChatSidebar />

      {/* Правая панель - окно активного чата*/}
      {activeChatId ? (
        <ChatWindow>
          <ChatWindow.Header slotTitle={<ChatHeaderInfo />} />
          <ChatWindow.Body
            slotMessages={
              // key={activeChatId} гарантирует полное размонтирование и повторное монтирование при смене диалога, сбрасывая состояние скролла Virtuoso
              <MessageHistory key={activeChatId} chatId={activeChatId} />
            }
          />
          <ChatWindow.Footer slotInput={<SendMessageBar />} />
        </ChatWindow>
      ) : (
        <ChatWindow.Empty />
      )}
    </Box>
  );
};
