export interface Contact {
    id: string;
    name: string;
    deviceId: string;
    lastSeen?: number;
    avatar?: string;
  }
  
  export interface Message {
    id: string;
    contactId: string;
    text: string;
    timestamp: number;
    isSent: boolean;
    isDelivered: boolean;
    isRead: boolean;
  }
  
  export interface Conversation {
    contactId: string;
    lastMessage?: Message;
    unreadCount: number;
  }
  
  export interface Device {
    id: string;
    name: string;
    type: 'wifi' | 'bluetooth';
    address?: string;
  }
  
  export type ConnectionType = 'wifi' | 'bluetooth';
  
  export interface ChatMessage {
    type: 'message' | 'delivery' | 'read' | 'typing';
    senderId: string;
    senderName: string;
    messageId?: string;
    text?: string;
    timestamp: number;
  }
  