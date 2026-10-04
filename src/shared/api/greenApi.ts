/**
 * Базовый HTTP-клиент и интерфейсы данных для взаимодействия с GREEN-API
 */

export interface GreenApiConfig {
  idInstance: string;
  apiTokenInstance: string;
  apiUrl?: string;
}

export interface SendMessagePayload {
  chatId: string;
  message: string;
  quotedMessageId?: string;
}

export interface SendMessageResponse {
  idMessage: string;
}

export interface CheckAccountResponse {
  exist: boolean;
  chatId?: string;
  fromCache?: boolean;
}

export interface StateInstanceResponse {
  stateInstance: 'authorized' | 'notAuthorized' | 'blocked' | 'sleepMode' | 'starting';
}

export interface InstanceSettingsResponse {
  wid?: string;
  countryInstance?: string;
  typeAccount?: string;
  webhookUrl?: string;
  webhookUrlToken?: string;
  delaySendMessagesMilliseconds?: number;
  outgoingWebhook?: string;
  outgoingMessageWebhook?: string;
  outgoingAPIMessageWebhook?: string;
  incomingWebhook?: string;
  stateWebhook?: string;
}

export interface ReceiveNotificationResponse {
  receiptId: number;
  body: {
    typeWebhook: string;
    instanceData?: {
      idInstance: number;
      wid: string;
      typeInstance: string;
    };
    timestamp: number;
    idMessage: string;
    chatId?: string;
    sendByApi?: boolean;
    senderData?: {
      chatId: string;
      sender: string;
      chatName?: string;
      senderName?: string;
      senderContactName?: string;
      senderPhoneNumber?: number | string;
    };
    messageData?: {
      typeMessage: string;
      textMessageData?: {
        textMessage: string;
      };
      extendedTextMessageData?: {
        text: string;
        description?: string;
        title?: string;
      };
      quotedMessage?: {
        textMessage?: string;
        extendedTextMessageData?: {
          text?: string;
        };
      };
      imageMessageData?: {
        caption?: string;
      };
      videoMessageData?: {
        caption?: string;
      };
      documentMessageData?: {
        fileName?: string;
      };
      reactionMessageData?: {
        reaction?: string;
      };
      fileMessageData?: {
        caption?: string;
        fileName?: string;
      };
    };
  };
}

export interface DeleteNotificationResponse {
  result: boolean;
}

export interface ChatHistoryMessage {
  type: 'incoming' | 'outgoing';
  idMessage: string;
  timestamp: number;
  typeMessage?: string;
  chatId: string;
  textMessage?: string;
  downloadUrl?: string;
  caption?: string;
  location?: unknown;
  contact?: unknown;
  extendedTextMessage?: {
    text: string;
    description?: string;
    title?: string;
    previewImageUrl?: string;
  };
}

/**
 * Надежная обертка fetch с гарантированным тайм-аутом,
 * предотвращающая бесконечное зависание сокетов в состоянии pending
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 15000,
  externalSignal?: AbortSignal
): Promise<Response> {
  const controller = new AbortController();
  let isTimedOut = false;
  const timer = setTimeout(() => {
    isTimedOut = true;
    controller.abort();
  }, timeoutMs);

  let onExternalAbort: (() => void) | undefined;
  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timer);
      controller.abort();
    } else {
      onExternalAbort = () => controller.abort();
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (err: unknown) {
    if (isTimedOut) {
      throw new Error(`Превышено время ожидания ответа от сервера (${timeoutMs / 1000} сек)`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
    if (externalSignal && onExternalAbort) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
}

/**
 * Вспомогательная функция задержки с поддержкой отмены через AbortSignal
 */
export function cancellableDelay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject(new DOMException('Aborted', 'AbortError'));
    }
    const timer = setTimeout(() => {
      if (signal) signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}

/**
 * Ограничения частоты запросов (Rate Limiter) GREEN-API по методам (минимальный интервал в мс).
 * getSettings, setSettings, getStateInstance, getChatHistory имеют лимит 1 запрос/сек на инстанс.
 */
const METHOD_RATE_LIMITS: Record<string, number> = {
  getSettings: 1200,
  setSettings: 1200,
  getStateInstance: 1200,
  getChatHistory: 1200,
  checkAccount: 400,
  sendMessage: 100,
  receiveNotification: 200,
  deleteNotification: 100,
};

// Хранилище запланированного времени выполнения запросов для каждого метода инстанса
const lastRequestTargetTime = new Map<string, number>();

/**
 * Превентивное троттлирование запросов на клиенте для предотвращения ошибки 429 Too Many Requests
 */
async function throttle(idInstance: string, method: string, signal?: AbortSignal): Promise<void> {
  const minInterval = METHOD_RATE_LIMITS[method];
  if (!minInterval) return;

  const key = `${idInstance}:${method}`;
  const now = Date.now();
  const scheduledTime = lastRequestTargetTime.get(key) || 0;
  const nextAllowedTime = Math.max(now, scheduledTime);
  const waitMs = nextAllowedTime - now;

  lastRequestTargetTime.set(key, nextAllowedTime + minInterval);

  if (waitMs > 0) {
    await cancellableDelay(waitMs, signal);
  }
}

/**
 * Общий диспетчер запросов:
 * 1. Превентивно удерживает безопасный интервал между запросами (pacing/throttle)
 * 2. При получении HTTP 429 автоматически выжидает backoff и повторяет запрос до maxRetries раз
 */
async function requestWithRetry(
  methodName: string,
  config: GreenApiConfig,
  fetchFn: () => Promise<Response>,
  signal?: AbortSignal,
  maxRetries = 3
): Promise<Response> {
  await throttle(config.idInstance, methodName, signal);

  let attempt = 0;
  while (true) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const response = await fetchFn();

    if (response.status === 429) {
      attempt++;
      if (attempt > maxRetries) {
        console.error(`[GREEN-API] Метод ${methodName} исчерпал лимит повторов (429 Too Many Requests)`);
        return response;
      }

      const retryAfterHeader = response.headers.get('Retry-After');
      let retryDelayMs = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : 0;

      if (!retryDelayMs || isNaN(retryDelayMs)) {
        // Экспоненциальная задержка: 1500мс, 3000мс, 6000мс + случайный jitter
        const baseDelay = 1500 * Math.pow(2, attempt - 1);
        const jitter = Math.floor(Math.random() * 300);
        retryDelayMs = baseDelay + jitter;
      }

      console.warn(
        `[GREEN-API] Метод ${methodName} вернул 429 (Too Many Requests). Попытка ${attempt}/${maxRetries}. Ожидание ${retryDelayMs}мс перед повтором...`
      );

      await cancellableDelay(retryDelayMs, signal);
      continue;
    }

    return response;
  }
}

class GreenApiClient {
  private getBaseUrl(config: GreenApiConfig): string {
    const host = (config.apiUrl || 'https://api.greenapi.com').replace(/\/+$/, '');
    return `${host}/waInstance${config.idInstance}`;
  }

  /**
   * Проверка состояния авторизации инстанса GREEN-API
   */
  async getStateInstance(config: GreenApiConfig, signal?: AbortSignal): Promise<StateInstanceResponse> {
    const url = `${this.getBaseUrl(config)}/getStateInstance/${config.apiTokenInstance}`;
    const response = await requestWithRetry(
      'getStateInstance',
      config,
      () => fetchWithTimeout(url, {}, 15000, signal),
      signal
    );
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Ошибка проверки инстанса (${response.status}): ${errText || response.statusText}`);
    }
    return response.json();
  }

  /**
   * Проверка наличия аккаунта мессенджера (например, MAX) по номеру телефона
   */
  async checkAccount(
    config: GreenApiConfig,
    phoneNumber: string | number,
    signal?: AbortSignal
  ): Promise<CheckAccountResponse> {
    const url = `${this.getBaseUrl(config)}/checkAccount/${config.apiTokenInstance}`;
    const cleanPhone = String(phoneNumber).replace(/\D/g, '');
    const numPhone = parseInt(cleanPhone, 10) || 0;

    const response = await requestWithRetry(
      'checkAccount',
      config,
      () =>
        fetchWithTimeout(
          url,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phoneNumber: numPhone || cleanPhone }),
          },
          15000,
          signal
        ),
      signal
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Ошибка проверки аккаунта (${response.status}): ${errText || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Отправка текстового сообщения в чат
   */
  async sendMessage(
    config: GreenApiConfig,
    payload: SendMessagePayload,
    signal?: AbortSignal
  ): Promise<SendMessageResponse> {
    const url = `${this.getBaseUrl(config)}/sendMessage/${config.apiTokenInstance}`;
    // Для отправки сообщений выполняем троттлинг, но НЕ используем автоповтор (retry),
    // так как метод не является идемпотентным: если сервер принял сообщение в очередь,
    // повторный вызов приведёт к дублированию сообщения у получателя.
    await throttle(config.idInstance, 'sendMessage', signal);

    const response = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
      60000,
      signal
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Ошибка отправки сообщения (${response.status}): ${errText || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Получение текущих настроек инстанса (вебхуки, задержки, URL)
   */
  async getSettings(config: GreenApiConfig, signal?: AbortSignal): Promise<InstanceSettingsResponse> {
    const url = `${this.getBaseUrl(config)}/getSettings/${config.apiTokenInstance}`;
    const response = await requestWithRetry(
      'getSettings',
      config,
      () => fetchWithTimeout(url, {}, 15000, signal),
      signal
    );
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Ошибка получения настроек (${response.status}): ${errText || response.statusText}`);
    }
    return response.json();
  }

  /**
   * Установка настроек инстанса (включение входящих вебхуков, очистка webhookUrl)
   */
  async setSettings(
    config: GreenApiConfig,
    settings: Record<string, string | number>,
    signal?: AbortSignal
  ): Promise<{ save: boolean }> {
    const url = `${this.getBaseUrl(config)}/setSettings/${config.apiTokenInstance}`;
    const response = await requestWithRetry(
      'setSettings',
      config,
      () =>
        fetchWithTimeout(
          url,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(settings),
          },
          15000,
          signal
        ),
      signal
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Ошибка настройки инстанса (${response.status}): ${errText || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Получение входящего уведомления из очереди (long polling)
   */
  async receiveNotification(
    config: GreenApiConfig,
    receiveTimeout = 5,
    signal?: AbortSignal
  ): Promise<ReceiveNotificationResponse | null> {
    const url = `${this.getBaseUrl(config)}/receiveNotification/${config.apiTokenInstance}?receiveTimeout=${receiveTimeout}`;
    const clientTimeoutMs = (receiveTimeout + 5) * 1000;

    const response = await requestWithRetry(
      'receiveNotification',
      config,
      () => fetchWithTimeout(url, {}, clientTimeoutMs, signal),
      signal
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Ошибка получения уведомления (${response.status}): ${errText || response.statusText}`);
    }

    const text = await response.text();
    if (!text || text.trim() === 'null' || !text.trim()) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  /**
   * Подтверждение и удаление полученного уведомления из очереди
   */
  async deleteNotification(
    config: GreenApiConfig,
    receiptId: number,
    signal?: AbortSignal
  ): Promise<DeleteNotificationResponse> {
    const url = `${this.getBaseUrl(config)}/deleteNotification/${config.apiTokenInstance}/${receiptId}`;
    const response = await requestWithRetry(
      'deleteNotification',
      config,
      () =>
        fetchWithTimeout(
          url,
          {
            method: 'DELETE',
          },
          15000,
          signal
        ),
      signal
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Ошибка удаления уведомления (${response.status}): ${errText || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Загрузка истории сообщений для указанного чата
   */
  async getChatHistory(
    config: GreenApiConfig,
    chatId: string,
    count = 100,
    signal?: AbortSignal
  ): Promise<ChatHistoryMessage[]> {
    const url = `${this.getBaseUrl(config)}/getChatHistory/${config.apiTokenInstance}`;
    const response = await requestWithRetry(
      'getChatHistory',
      config,
      () =>
        fetchWithTimeout(
          url,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ chatId, count }),
          },
          30000,
          signal
        ),
      signal
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Ошибка загрузки истории (${response.status}): ${errText || response.statusText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }
}

export const greenApi = new GreenApiClient();
