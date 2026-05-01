export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  username: string;
  photoURL?: string;
  bio?: string;
  phoneNumber?: string;
  gender?: string;
  isVerified?: boolean;
  isAdmin?: boolean;
  lastSeen?: any;
  status?: 'online' | 'offline';
  followers?: string[];
  following?: string[];
  blockedUsers?: string[];
  privacy?: {
    lastSeen?: 'everyone' | 'contacts' | 'nobody';
    profilePhoto?: 'everyone' | 'contacts' | 'nobody';
    about?: 'everyone' | 'contacts' | 'nobody';
    groups?: 'everyone' | 'contacts' | 'nobody';
  };
  lock?: {
    isEnabled: boolean;
    type: 'pin4' | 'pin6' | 'alpha' | null;
    hash: string | null;
  };
  hiddenChats?: string[];
  archivedChats?: string[];
  hiddenChatSettings?: {
    secretCode: string | null;
    showMenuEntry: boolean;
  };
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: any;
  type: 'text' | 'image' | 'video' | 'audio' | 'file';
  fileUrl?: string;
  fileName?: string;
  replyTo?: string;
  isEdited?: boolean;
  readBy?: string[];
}

export interface ChatRoom {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageTime?: any;
  unreadCount?: { [userId: string]: number };
  type: 'direct' | 'group';
  name?: string;
  groupImage?: string;
  adminIds?: string[];
}
