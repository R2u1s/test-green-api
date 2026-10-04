import React from 'react';
import { Box, Typography } from '@mui/material';
import { Message } from '../model/types';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = React.memo(({ message }) => {
  const isOut = message.isOutgoing;

  // Форматирование времени отправки (чч:мм) с защитой от лишних пересчетов при ререндере
  const timeString = React.useMemo(() => {
    const d = new Date(message.timestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [message.timestamp]);

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isOut ? 'flex-end' : 'flex-start',
        width: '100%',
        py: 0.75,
        boxSizing: 'border-box',
      }}
    >
      <Box
        sx={{
          maxWidth: { xs: '85%', sm: '70%', md: '60%' },
          bgcolor: isOut ? '#0077FF' : '#F0F2F5',
          color: isOut ? '#FFFFFF' : '#111111',
          px: 2,
          py: 1,
          borderRadius: isOut ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          wordBreak: 'break-word',
          position: 'relative',
        }}
      >
        <Typography
          variant="body1"
          sx={{
            fontSize: '0.9375rem',
            lineHeight: 1.4,
            display: 'inline',
            mr: 4,
          }}
        >
          {message.text}
        </Typography>

        <Box
          component="span"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            float: 'right',
            mt: 0.5,
            ml: 1,
            color: isOut ? 'rgba(255, 255, 255, 0.75)' : '#8E949D',
            fontSize: '0.75rem',
          }}
        >
          <span>{timeString}</span>
        </Box>
      </Box>
    </Box>
  );
});
