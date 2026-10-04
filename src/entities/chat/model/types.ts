export interface Chat {
  id: string; // Идентификатор чата в GREEN-API, например: "79991234567@c.us"
  phoneNumber: string;
  name: string;
  avatarUrl?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  isLastMessageOutgoing?: boolean;
}

