import React, { ReactNode } from 'react';
import { Box, Typography, Avatar, IconButton } from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ForumRoundedIcon from '@mui/icons-material/ForumRounded';
import { useChatStore } from '@/entities/chat';

interface ChatWindowRootProps {
  children: ReactNode;
}

const Root: React.FC<ChatWindowRootProps> = ({ children }) => {
  return (
    <Box
      sx={{
        flex: 1,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#FFFFFF',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {children}
    </Box>
  );
};

interface ChatWindowHeaderProps {
  slotTitle?: ReactNode;
  slotActions?: ReactNode;
}

const Header: React.FC<ChatWindowHeaderProps> = ({ slotTitle, slotActions }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 3,
        py: 1.5,
        minHeight: 64,
        borderBottom: '1px solid #ECEEF1',
        bgcolor: '#FFFFFF',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, overflow: 'hidden' }}>
        {slotTitle}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {slotActions || (
          <IconButton sx={{ color: '#8E949D', '&:hover': { color: '#0077FF' } }}>
            <SearchRoundedIcon />
          </IconButton>
        )}
      </Box>
    </Box>
  );
};

interface ChatWindowBodyProps {
  slotMessages: ReactNode;
}

const Body: React.FC<ChatWindowBodyProps> = ({ slotMessages }) => {
  return (
    <Box
      sx={{
        flex: 1,
        overflow: 'hidden',
        position: 'relative',
        bgcolor: '#FFFFFF',
      }}
    >
      {slotMessages}
    </Box>
  );
};

interface ChatWindowFooterProps {
  slotInput: ReactNode;
}

const Footer: React.FC<ChatWindowFooterProps> = ({ slotInput }) => {
  return <Box sx={{ width: '100%' }}>{slotInput}</Box>;
};

const Empty: React.FC = () => {
  return (
    <Box
      sx={{
        flex: 1,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#F9FAFB',
        color: '#8E949D',
        p: 3,
        textAlign: 'center',
      }}
    >
      <Box
        sx={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          bgcolor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 2,
          color: '#0077FF',
        }}
      >
        <ForumRoundedIcon sx={{ fontSize: 36 }} />
      </Box>
      <Typography variant="h6" sx={{ color: '#111111', fontWeight: 600, mb: 0.5 }}>
        Выберите диалог
      </Typography>
      <Typography variant="body2" sx={{ color: '#8E949D', maxWidth: 360 }}>
        Выберите контакт из списка слева или создайте новый чат с помощью кнопки «+»
      </Typography>
    </Box>
  );
};

export const ChatHeaderInfo: React.FC = () => {
  // Получение идентификатора активного чата и объекта выбранного контакта
  const activeChatId = useChatStore((s) => s.activeChatId);
  const activeChat = useChatStore((s) => s.chats.find((c) => c.id === activeChatId));

  if (!activeChat) return null;

  const initial = (activeChat.name || activeChat.phoneNumber || '?').charAt(0).toUpperCase();

  return (
    <>
      <Avatar
        src={activeChat.avatarUrl}
        sx={{
          width: 40,
          height: 40,
          bgcolor: '#0077FF',
          fontWeight: 600,
          fontSize: '1rem',
        }}
      >
        {initial}
      </Avatar>
      <Box sx={{ overflow: 'hidden' }}>
        <Typography
          variant="body1"
          sx={{
            fontWeight: 600,
            color: '#111111',
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {activeChat.name || activeChat.phoneNumber}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: '#8E949D',
            display: 'block',
            lineHeight: 1.2,
            mt: 0.25,
          }}
        >
          {activeChat.phoneNumber}
        </Typography>
      </Box>
    </>
  );
};

export const ChatWindow = Object.assign(Root, {
  Header,
  Body,
  Footer,
  Empty,
});
