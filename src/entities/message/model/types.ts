export interface Message {
  id: string;
  chatId: string;
  text: string;
  timestamp: number;
  isOutgoing: boolean;
}
