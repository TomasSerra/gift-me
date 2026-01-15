import type { Timestamp } from "firebase/firestore";

export type Currency = "USD" | "ARS";

export interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  photoURL?: string;
  birthday?: Timestamp;
  createdAt: Timestamp;
}

export interface WishlistItem {
  id: string;
  ownerId: string;
  name: string;
  images?: string[];
  price?: number;
  currency?: Currency;
  description?: string;
  link?: string;
  priority: number;
  folderIds?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Folder {
  id: string;
  ownerId: string;
  name: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Friendship {
  id: string;
  users: [string, string];
  createdAt: Timestamp;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: Timestamp;
}

export interface ActivityItem {
  id: string;
  userId: string;
  type: "item_added";
  wishlistItemId: string;
  itemName: string;
  itemDescription?: string;
  itemImages?: string[];
  itemPrice?: number;
  itemCurrency?: Currency;
  itemLink?: string;
  createdAt: Timestamp;
}

export interface UserWithFriendship extends User {
  friendshipStatus?: "none" | "friends" | "pending_sent" | "pending_received";
  requestId?: string;
}
