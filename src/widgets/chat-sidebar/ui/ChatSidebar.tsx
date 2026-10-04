import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  InputBase,
  Tooltip,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import CircleRoundedIcon from '@mui/icons-material/CircleRounded';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '@/entities/session';
import { useChatStore, ChatCard } from '@/entities/chat';
import { AddChatModal } from '@/features/create-chat';

export const ChatSidebar: React.FC = () => {
  const navigate = useNavigate();

  // Выход из аккаунта и получение idInstance
  const logout = useSessionStore((s) => s.logout);
  const idInstance = useSessionStore((s) => s.idInstance);

  // Получение массива чатов, активного чата и функции его переключения
  const chats = useChatStore((s) => s.chats);
  const activeChatId = useChatStore((s) => s.activeChatId);
  const setActiveChatId = useChatStore((s) => s.setActiveChatId);

  // Управление поисковой строкой и видимостью модального окна добавления чата
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredChats = chats.filter((chat) => {
    const q = searchQuery.toLowerCase();
    return (
      chat.name.toLowerCase().includes(q) ||
      chat.phoneNumber.toLowerCase().includes(q) ||
      (chat.lastMessage && chat.lastMessage.toLowerCase().includes(q))
    );
  });

  return (
    <Box
      sx={{
        width: { xs: '100%', sm: 340, md: 380 },
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid #ECEEF1',
        bgcolor: '#FFFFFF',
      }}
    >
      {/* Верхняя панель: Заголовок "Чаты" + Кнопка добавления нового чата (+) + Выход */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2.5,
          pt: 2.5,
          pb: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.4rem', color: '#111111' }}>
            Чаты
          </Typography>
          <Tooltip title={`Инстанс: ${idInstance}`}>
            <CircleRoundedIcon sx={{ fontSize: 10, color: '#10B981', mt: 0.5 }} />
          </Tooltip>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Новый чат">
            <IconButton
              onClick={() => setIsAddModalOpen(true)}
              sx={{
                bgcolor: '#0077FF',
                color: '#FFFFFF',
                width: 36,
                height: 36,
                '&:hover': {
                  bgcolor: '#0066DD',
                },
              }}
            >
              <AddRoundedIcon sx={{ fontSize: 22 }} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Выйти из аккаунта">
            <IconButton
              onClick={handleLogout}
              sx={{
                color: '#8E949D',
                width: 36,
                height: 36,
                '&:hover': {
                  color: '#FF3B30',
                  bgcolor: '#FFF2F2',
                },
              }}
            >
              <LogoutRoundedIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Поле поиска */}
      <Box sx={{ px: 2, pb: 1.5 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            bgcolor: '#F0F2F5',
            borderRadius: '20px',
            px: 1.75,
            py: 0.6,
          }}
        >
          <SearchRoundedIcon sx={{ color: '#8E949D', fontSize: 20, mr: 1 }} />
          <InputBase
            placeholder="Найти"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            fullWidth
            sx={{
              fontSize: '0.9rem',
              color: '#111111',
              '& ::placeholder': {
                color: '#8E949D',
                opacity: 1,
              },
            }}
          />
        </Box>
      </Box>

      {/* Список диалогов или заглушка пустого состояния */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 1 }}>
        {filteredChats.length === 0 ? (
          <Box
            sx={{
              height: '80%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              p: 3,
              color: '#8E949D',
            }}
          >
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                bgcolor: '#F5F7FA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 1.5,
                color: '#8E949D',
              }}
            >
              <ForumOutlinedIcon sx={{ fontSize: 28 }} />
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 500, color: '#4B5563', mb: 0.5 }}>
              Нет активных чатов
            </Typography>
            <Typography variant="caption" sx={{ color: '#8E949D', maxWidth: 220 }}>
              Нажмите синюю кнопку «+» сверху, чтобы добавить контакт и начать переписку
            </Typography>
          </Box>
        ) : (
          filteredChats.map((chat) => (
            <ChatCard
              key={chat.id}
              chat={chat}
              isSelected={chat.id === activeChatId}
              onSelect={setActiveChatId}
            />
          ))
        )}
      </Box>

      {/* Модальное окно создания нового чата */}
      <AddChatModal open={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </Box>
  );
};
