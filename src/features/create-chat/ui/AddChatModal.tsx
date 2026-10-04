import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
  CircularProgress,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import PersonAddAlt1RoundedIcon from '@mui/icons-material/PersonAddAlt1Rounded';
import { formatRussianPhone } from '@/shared/lib/phone';
import { useChatStore } from '@/entities/chat';
import { useSessionStore } from '@/entities/session';
import { greenApi } from '@/shared/api';

interface AddChatModalProps {
  open: boolean;
  onClose: () => void;
}

export const AddChatModal: React.FC<AddChatModalProps> = ({ open, onClose }) => {
  const session = useSessionStore();
  const addChat = useChatStore((s) => s.addChat);

  const [phoneInput, setPhoneInput] = useState('');
  const [contactName, setContactName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const parsed = formatRussianPhone(value);
    setPhoneInput(parsed.formatted);
    if (error) setError('');
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setPhoneInput('');
    setContactName('');
    setError('');
    onClose();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = formatRussianPhone(phoneInput);

    if (!parsed.rawDigits || parsed.rawDigits.length < 11) {
      setError('Пожалуйста, введите полный номер телефона (11 цифр)');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const finalChatId = parsed.chatId;

    // Проверяем аккаунт через метод checkAccount
    try {
      if (session.idInstance && session.apiTokenInstance) {
        const checkResult = await greenApi.checkAccount(
          {
            idInstance: session.idInstance,
            apiTokenInstance: session.apiTokenInstance,
            apiUrl: session.apiUrl,
          },
          parsed.rawDigits
        );

        if (checkResult.exist === false) {
          setError('Пользователь с таким номером телефона не зарегистрирован в WhatsApp');
          setIsSubmitting(false);
          return;
        }
      }
    } catch (checkErr) {
      console.warn('Не удалось проверить аккаунт через checkAccount:', checkErr);
      // Если метод checkAccount недоступен или вернул ошибку, создаем чат с parsed.chatId
    }

    const displayName = contactName.trim() || parsed.formatted;

    addChat({
      id: finalChatId,
      phoneNumber: parsed.formatted,
      name: displayName,
      lastMessage: '',
      lastMessageTime: '',
    });

    setIsSubmitting(false);
    handleClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3.5,
          p: 1,
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 2, pt: 1, pl: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              bgcolor: '#EBF3FE',
              color: '#0077FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PersonAddAlt1RoundedIcon fontSize="small" />
          </Box>
          <DialogTitle sx={{ p: 0, fontSize: '1.2rem', fontWeight: 600 }}>Новый чат</DialogTitle>
        </Box>
        <IconButton onClick={handleClose} size="small" disabled={isSubmitting} sx={{ color: '#8E949D' }}>
          <CloseRoundedIcon />
        </IconButton>
      </Box>

      <Box component="form" onSubmit={handleCreate}>
        <DialogContent sx={{ pt: 2, pb: 1 }}>
          <Typography variant="body2" sx={{ color: '#71757B', mb: 2 }}>
            Введите номер телефона в формате РФ. Начните вводить с 9, и префикс +7 подставится автоматически.
          </Typography>

          <TextField
            autoFocus
            margin="dense"
            label="Номер телефона"
            placeholder="+7 (999) 123-45-67"
            fullWidth
            value={phoneInput}
            onChange={handlePhoneChange}
            error={Boolean(error)}
            helperText={error}
            disabled={isSubmitting}
            sx={{ mb: 2 }}
          />

          <TextField
            margin="dense"
            label="Имя собеседника (необязательно)"
            placeholder="Например: Иван"
            fullWidth
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            disabled={isSubmitting}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
          <Button onClick={handleClose} disabled={isSubmitting} sx={{ color: '#71757B' }}>
            Отмена
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            sx={{
              bgcolor: '#0077FF',
              px: 3,
              minWidth: 130,
              '&:hover': {
                bgcolor: '#0066DD',
              },
            }}
          >
            {isSubmitting ? <CircularProgress size={22} sx={{ color: '#FFFFFF' }} /> : 'Создать чат'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};
