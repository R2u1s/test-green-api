import React, { useState, useCallback } from 'react';
import { Box, InputBase, IconButton, CircularProgress } from '@mui/material';
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded';
import SentimentSatisfiedAltOutlinedIcon from '@mui/icons-material/SentimentSatisfiedAltOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import MicNoneRoundedIcon from '@mui/icons-material/MicNoneRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import { useChatStore } from '@/entities/chat';
import { useMessageStore, useSendMessageMutation } from '@/entities/message';

export const SendMessageBar: React.FC = React.memo(() => {
  // Локальное состояние поля: набор текста пользователем не вызывает ререндер родительских компонентов или списка сообщений
  const [text, setText] = useState('');

  // Получения идентификатора текущего открытого чата
  const activeChatId = useChatStore((s) => s.activeChatId);
  // Добавление нового сообщения в список диалога
  const addMessage = useMessageStore((s) => s.addMessage);
  // Обновление превью и времени последнего сообщения в списке чатов
  const updateLastMessage = useChatStore((s) => s.updateLastMessage);

  // Отправка сообщения через API
  const sendMutation = useSendMessageMutation();

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || !activeChatId || sendMutation.isPending) return;

    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const tempId = `out_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    // Оптимистичное обновление интерфейса: сообщение появляется в списке
    addMessage(activeChatId, {
      id: tempId,
      chatId: activeChatId,
      text: trimmed,
      timestamp: Date.now(),
      isOutgoing: true,
    });

    updateLastMessage(activeChatId, trimmed, timeString, true);
    setText('');

    sendMutation.mutate({
      chatId: activeChatId,
      messageText: trimmed,
      tempId,
    });
  }, [text, activeChatId, addMessage, updateLastMessage, sendMutation]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!sendMutation.isPending) {
        handleSend();
      }
    }
  };

  const hasText = text.trim().length > 0;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        px: 2,
        py: 1.25,
        bgcolor: '#FFFFFF',
        borderTop: '1px solid #ECEEF1',
        gap: 1,
      }}
    >
      <IconButton size="medium" sx={{ color: '#8E949D', '&:hover': { color: '#0077FF' } }}>
        <AttachFileRoundedIcon sx={{ transform: 'rotate(45deg)', fontSize: 24 }} />
      </IconButton>

      <Box
        sx={{
          flex: 1,
          bgcolor: '#FFFFFF',
          borderRadius: 3,
          px: 1.5,
          py: 0.5,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <InputBase
          placeholder="Сообщение"
          fullWidth
          multiline
          maxRows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          sx={{
            fontSize: '0.9375rem',
            color: '#111111',
            '& ::placeholder': {
              color: '#8E949D',
              opacity: 1,
            },
          }}
        />
      </Box>

      {hasText ? (
        <IconButton
          onClick={handleSend}
          disabled={sendMutation.isPending}
          sx={{
            bgcolor: '#0077FF',
            color: '#FFFFFF',
            width: 40,
            height: 40,
            '&:hover': {
              bgcolor: '#0066DD',
            },
            '&.Mui-disabled': {
              bgcolor: '#93C5FD',
              color: '#FFFFFF',
            },
          }}
        >
          {sendMutation.isPending ? (
            <CircularProgress size={18} sx={{ color: '#FFFFFF' }} />
          ) : (
            <SendRoundedIcon sx={{ fontSize: 20, ml: '2px' }} />
          )}
        </IconButton>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton size="medium" sx={{ color: '#8E949D' }}>
            <SentimentSatisfiedAltOutlinedIcon sx={{ fontSize: 22 }} />
          </IconButton>
          <IconButton size="medium" sx={{ color: '#8E949D' }}>
            <ImageOutlinedIcon sx={{ fontSize: 22 }} />
          </IconButton>
          <IconButton size="medium" sx={{ color: '#8E949D' }}>
            <MicNoneRoundedIcon sx={{ fontSize: 22 }} />
          </IconButton>
        </Box>
      )}
    </Box>
  );
});
