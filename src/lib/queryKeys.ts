export const queryKeys = {
  users: {
    all: ['users'] as const,
    detail: (userId: string) => ['users', userId] as const,
  },
  friends: {
    all: (userId: string) => ['friends', userId] as const,
    requests: (userId: string) => ['friendRequests', userId] as const,
  },
  friendshipStatus: (userId1: string, userId2: string) => {
    const sorted = [userId1, userId2].sort();
    return ['friendshipStatus', sorted[0], sorted[1]] as const;
  },
  wishlist: {
    user: (userId: string) => ['wishlist', userId] as const,
    item: (itemId: string) => ['wishlist', 'item', itemId] as const,
  },
  folders: {
    user: (userId: string) => ['folders', userId] as const,
    detail: (folderId: string) => ['folders', 'detail', folderId] as const,
  },
  activity: {
    feed: (userId: string) => ['activity', 'feed', userId] as const,
  },
  purchases: {
    byOwner: (itemOwnerId: string) => ['purchases', 'byOwner', itemOwnerId] as const,
  },
};
