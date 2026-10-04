import React, { useEffect } from 'react';
import { Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { LoginForm } from '@/features/auth-by-credentials';
import { useSessionStore } from '@/entities/session';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  // Проверка текущего статуса авторизации
  const isAuth = useSessionStore((s) => s.isAuth);

  // Автоматическое перенаправление в чат, если сессия уже активна
  useEffect(() => {
    if (isAuth) {
      navigate('/chat', { replace: true });
    }
  }, [isAuth, navigate]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        bgcolor: '#F5F7FA',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <LoginForm />
    </Box>
  );
};
