import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Paper, Alert, CircularProgress } from '@mui/material';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import { useNavigate } from 'react-router-dom';
import { useSessionStore, useCheckInstanceMutation } from '@/entities/session';

export const LoginForm: React.FC = () => {
  const navigate = useNavigate();

  // Получение метода авторизации и сохраненных параметров инстанса
  const login = useSessionStore((s) => s.login);
  const storedIdInstance = useSessionStore((s) => s.idInstance);
  const storedApiToken = useSessionStore((s) => s.apiTokenInstance);
  const storedApiUrl = useSessionStore((s) => s.apiUrl);

  // Управление локальным состоянием полей ввода и сообщением об ошибке
  const [idInstance, setIdInstance] = useState(storedIdInstance || '');
  const [apiTokenInstance, setApiTokenInstance] = useState(storedApiToken || '');
  const [error, setError] = useState<string | null>(null);

  // Проверка валидности ключей через запрос getStateInstance
  const checkInstanceMutation = useCheckInstanceMutation();
  const isLoading = checkInstanceMutation.isPending;

  const doSubmit = async () => {
    setError(null);

    const trimmedId = idInstance.trim();
    const trimmedToken = apiTokenInstance.trim();
    const apiUrl = storedApiUrl || 'https://api.greenapi.com';

    if (!trimmedId || !trimmedToken) {
      setError('Пожалуйста, заполните idInstance и apiTokenInstance');
      return;
    }

    try {
      // Валидируем учетные данные через запрос к GREEN-API с помощью мутации TRQ
      await checkInstanceMutation.mutateAsync({
        idInstance: trimmedId,
        apiTokenInstance: trimmedToken,
        apiUrl,
      });

      login(trimmedId, trimmedToken, apiUrl);
      navigate('/chat');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Не удалось проверить инстанс';
      setError(message);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSubmit();
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 3, sm: 4.5 },
        width: '100%',
        maxWidth: 460,
        borderRadius: 4,
        border: '1px solid #E5E7EB',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.04)',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            bgcolor: '#0077FF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            mb: 2,
          }}
        >
          <ChatBubbleOutlineRoundedIcon sx={{ fontSize: 32 }} />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#111111', textAlign: 'center' }}>
          Вход с учетными данными GREEN-API
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2.5 }}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <TextField
          margin="normal"
          fullWidth
          id="idInstance"
          label="idInstance"
          name="idInstance"
          placeholder="Например: 1101823456"
          value={idInstance}
          onChange={(e) => setIdInstance(e.target.value)}
          autoFocus
          size="medium"
          disabled={isLoading}
        />
        <TextField
          margin="normal"
          fullWidth
          name="apiTokenInstance"
          label="apiTokenInstance"
          type="password"
          id="apiTokenInstance"
          placeholder="Например: 2f738f7a60..."
          value={apiTokenInstance}
          onChange={(e) => setApiTokenInstance(e.target.value)}
          size="medium"
          disabled={isLoading}
        />

        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          disabled={isLoading}
          sx={{
            mt: 3,
            py: 1.4,
            fontSize: '1rem',
            fontWeight: 600,
            borderRadius: 2.5,
            bgcolor: '#0077FF',
            '&:hover': {
              bgcolor: '#0066DD',
            },
          }}
        >
          {isLoading ? <CircularProgress size={24} sx={{ color: '#FFFFFF' }} /> : 'Войти'}
        </Button>
      </form>
    </Paper>
  );
};
