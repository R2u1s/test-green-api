/**
 * форматтер ввода российских номеров телефонов:
 * - Если пользователь начинает ввод с '9', автоматически подставляет '+7 (9'
 * - Если пользователь начинает ввод с '8', '+7' или '7', правильно форматирует в вид +7 (XXX) XXX-XX-XX
 * - Позволяет вводить дефисы, скобки, пробелы без сбоев
 * - Возвращает форматированную строку для отображения, чистые цифры и флаг валидности
 */

export interface PhoneFormatResult {
  formatted: string;
  rawDigits: string; // Только цифры (например, 79991234567)
  isValid: boolean;
  chatId: string; // Формат идентификатора GREEN-API: 79991234567@c.us
}

export function formatRussianPhone(input: string): PhoneFormatResult {
  // Удаляем пробелы по краям
  let cleaned = input.trim();

  // Если ввод начинается с '9', преобразуем в '79...'
  if (cleaned.startsWith('9')) {
    cleaned = '7' + cleaned;
  } else if (cleaned.startsWith('+7')) {
    cleaned = '7' + cleaned.slice(2);
  } else if (cleaned.startsWith('8') && cleaned.length > 1) {
    cleaned = '7' + cleaned.slice(1);
  } else if (cleaned.startsWith('+')) {
    cleaned = cleaned.slice(1);
  }

  // Извлекаем все цифры
  const digits = cleaned.replace(/\D/g, '');

  if (!digits) {
    return {
      formatted: '',
      rawDigits: '',
      isValid: false,
      chatId: '',
    };
  }

  // Гарантируем ведущую 7 для российских номеров
  let normalizedDigits = digits;
  if (!normalizedDigits.startsWith('7')) {
    normalizedDigits = '7' + normalizedDigits;
  }

  // Ограничиваем длину 11 цифрами (7 + 10 цифр)
  normalizedDigits = normalizedDigits.slice(0, 11);

  // Формируем форматированную строку: +7 (XXX) XXX-XX-XX
  let formatted = '+7';
  if (normalizedDigits.length > 1) {
    formatted += ' (' + normalizedDigits.slice(1, 4);
  }
  if (normalizedDigits.length >= 4) {
    formatted += ') ';
  }
  if (normalizedDigits.length > 4) {
    formatted += normalizedDigits.slice(4, 7);
  }
  if (normalizedDigits.length >= 7) {
    formatted += '-';
  }
  if (normalizedDigits.length > 7) {
    formatted += normalizedDigits.slice(7, 9);
  }
  if (normalizedDigits.length >= 9) {
    formatted += '-';
  }
  if (normalizedDigits.length > 9) {
    formatted += normalizedDigits.slice(9, 11);
  }

  const isValid = normalizedDigits.length === 11 && normalizedDigits.startsWith('79');
  const chatId = normalizedDigits ? `${normalizedDigits}@c.us` : '';

  return {
    formatted,
    rawDigits: normalizedDigits,
    isValid,
    chatId,
  };
}
