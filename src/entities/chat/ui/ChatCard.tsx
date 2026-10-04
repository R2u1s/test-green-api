import React, { useCallback } from 'react';
import { Box, Typography, Avatar, ListItemButton } from '@mui/material';
import { Chat } from '../model/types';
import { useMessageStore } from '@/entities/message';

interface ChatCardProps {
  chat: Chat;
  isSelected: boolean;
  onSelect: (chatId: string) => void;
}

export const ChatCard: React.FC<ChatCardProps> = React.memo(({ chat, isSelected, onSelect }) => {
  const handleClick = () => {
    onSelect(chat.id);
  };

  const initial = (chat.name || chat.phoneNumber || '?').charAt(0).toUpperCase();

  // Синхронизация в реальном времени с хранилищем сообщений useMessageStore, чтобы сайдбар мгновенно обновлял текст последнего сообщения
  // Хук для получения самого актуального последнего сообщения диалога
  const lastStoreMessage = useMessageStore(
    useCallback(
      (state) => {
        const msgs =
          state.messages[chat.id] ||
          Object.entries(state.messages).find(([key]) => {
            const c1 = key.replace(/\D/g, '');
            const c2 = chat.id.replace(/\D/g, '');
            return Boolean(c1 && c2 && c1 === c2);
          })?.[1];

        if (!msgs || msgs.length === 0) return null;
        return msgs[msgs.length - 1];
      },
      [chat.id]
    )
  );

  const lastMessageText = lastStoreMessage ? lastStoreMessage.text : (chat.lastMessage || 'Нет сообщений');
  const lastMessageTime = lastStoreMessage
    ? new Date(lastStoreMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : chat.lastMessageTime;

  return (
    <ListItemButton
      onClick={handleClick}
      selected={isSelected}
      sx={{
        px: 2,
        py: 1.5,
        borderRadius: 2,
        mb: 0.5,
        transition: 'background-color 0.15s ease',
        '&.Mui-selected': {
          bgcolor: '#EBF3FE',
          '&:hover': {
            bgcolor: '#E2EEFD',
          },
        },
        '&:hover': {
          bgcolor: '#F5F7FA',
        },
      }}
    >
      <Avatar
        src={chat.avatarUrl}
        sx={{
          width: 48,
          height: 48,
          bgcolor: '#0077FF',
          fontSize: '1.125rem',
          fontWeight: 600,
          mr: 1.75,
        }}
      >
        {initial}
      </Avatar>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
          <Typography
            variant="body1"
            sx={{
              fontWeight: isSelected ? 600 : 500,
              color: '#111111',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {chat.name || chat.phoneNumber}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', ml: 1, flexShrink: 0 }}>
            {lastMessageTime && (
              <Typography variant="caption" sx={{ color: '#8E949D' }}>
                {lastMessageTime}
              </Typography>
            )}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography
            variant="body2"
            sx={{
              color: '#71757B',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontSize: '0.84375rem',
            }}
          >
            {lastMessageText}
          </Typography>

          {Boolean(chat.unreadCount && chat.unreadCount > 0) && (
            <Box
              sx={{
                bgcolor: '#9EAAB6',
                color: '#FFFFFF',
                borderRadius: '12px',
                px: 0.8,
                py: 0.1,
                fontSize: '0.75rem',
                fontWeight: 600,
                minWidth: 20,
                textAlign: 'center',
                ml: 1,
              }}
            >
              {chat.unreadCount}
            </Box>
          )}
        </Box>
      </Box>
    </ListItemButton>
  );
});
