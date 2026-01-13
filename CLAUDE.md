# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev       # Start development server with HMR
npm run build     # TypeScript compile + Vite production build
npm run lint      # Run ESLint
npm run preview   # Preview production build locally
```

## Architecture Overview

**GiftMe** is a social wishlist PWA built with React 19, TypeScript, Vite, and Firebase.

### Tech Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 (via `@tailwindcss/vite` plugin)
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Data Fetching**: TanStack React Query with Firestore real-time listeners
- **Forms**: react-hook-form + zod validation
- **Routing**: react-router-dom v7
- **PWA**: vite-plugin-pwa with Workbox

### Project Structure

```
src/
├── components/
│   ├── ui/           # Reusable UI primitives (button, card, dialog, etc.)
│   ├── auth/         # Login, register, forgot password forms
│   ├── home/         # Activity feed, event carousel
│   ├── profile/      # Profile header, edit profile sheet
│   ├── wishlist/     # Wishlist forms, items, image carousel
│   ├── friends/      # Friends list, requests, user search
│   └── layout/       # Page container, bottom navigation
├── pages/            # Route-level page components
├── hooks/            # Custom hooks for data fetching (useWishlist, useFriends, etc.)
├── contexts/         # AuthContext for authentication state
├── lib/              # Firebase config, utilities, storage helpers, query keys
└── types/            # TypeScript type definitions
```

### Key Patterns

**Data Fetching**: Hooks in `src/hooks/` combine Firestore `onSnapshot` listeners with React Query for caching. The `queryKeys.ts` file centralizes all cache keys. Real-time updates propagate through `onSnapshot` callbacks that update the React Query cache.

**Authentication**: `AuthContext` wraps Firebase Auth and syncs with Firestore user documents. Use `useAuth()` hook to access user state, login/register/logout functions.

**Path Alias**: `@/` maps to `src/` directory (configured in vite.config.ts and tsconfig).

### Firestore Collections
- `users` - User profiles (keyed by Firebase Auth UID)
- `wishlistItems` - Individual wishlist items (has `ownerId` field)
- `friendships` - Friend connections between users
- `friendRequests` - Pending friend requests
- `activity` - Activity feed entries (item additions)

### Environment Variables
Firebase config uses `VITE_PUBLIC_FIREBASE_*` env vars (see `src/lib/firebase.ts`).
