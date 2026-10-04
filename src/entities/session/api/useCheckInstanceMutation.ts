import { useMutation } from '@tanstack/react-query';
import { greenApi, GreenApiConfig, StateInstanceResponse } from '@/shared/api';

// Хук для проверки статуса авторизации инстанса GREEN-API через TRQ
export function useCheckInstanceMutation() {
  return useMutation<StateInstanceResponse, Error, GreenApiConfig>({
    mutationFn: (config: GreenApiConfig) => greenApi.getStateInstance(config),
  });
}
