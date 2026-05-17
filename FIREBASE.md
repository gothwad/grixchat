# Firebase Usage Analysis - GrixChat

This document tracks and explains all Firebase Firestore & Realtime Database operations within the GrixChat application.

## 📊 Summary of Active Collections

| Collection | Purpose | Expected Volume |
|------------|---------|-----------------|
| `users` | Profile data, following/followers, blocked lists, settings. | High reads (global), Medium writes. |
| `posts` | Images, captions, likes. | High reads (feed), Low writes. |
| `reels` | Short videos. | High reads, Low writes. |
| `conversations` | Group/Direct chat metadata, unread counts. | Medium reads, High writes (every message). |
| `messages` | Chat history. | High reads (real-time), High writes. |
| `notifications` | Social alerts. | Medium reads, Medium writes. |
| `stories` | 24-hour updates. | High reads, Low writes. |
| `tube_videos` | Long-form content. | Medium reads, Low writes. |

---

## 🔍 Critical Cost & Read Hotspots (The "Leaks")

### 1. Home Tab Feed (`src/features/home/HomeTab.tsx`)
*   **The Issue:** The feed fetches the latest **20 posts from the entire collection** without target filtering.
*   **Cost:** 20 reads *every time* any user opens the app or any new post is uploaded globally.
*   **Waste:** If a user only follows 2 people, but 100 strangers post, the user still "reads" those stranger posts in the background only for the code to hide them in memory.
*   **Read Count:** `O(limit) * Active Users`.

### 2. Conversation Fetching (`src/features/chat/hooks/useConversations.ts`)
*   **The Issue:** Inside the `onSnapshot` for conversations (which triggers on ANY new message in ANY chat), the code fetches 20 random users as "Suggestions".
*   **Waste:** If you are in a chat and 10 messages arrive, you might perform 200 user-doc reads (`20 suggestions * 10 messages`) in a few seconds just for a side-bar.
*   **Read Count:** `20 * Messages * Active User`.

### 3. Presence Bridge (`src/providers/AuthProvider.tsx`)
*   **The Issue:** Every status change in Realtime Database (RTDB) triggers an `updateDoc` on the Firestore user document.
*   **Cost:** If a user has a spotty connection, they might write to their user doc multiple times a minute.
*   **Chain Reaction:** Any other user watching that person's profile or chat (via `onSnapshot`) will also trigger a new read on every status update.

### 4. Search & Suggestions (`src/features/chat/SearchUserScreen.tsx`)
*   **The Issue:** Multi-collection `getDocs` calls on mount (Users, Videos, Reels).
*   **Read Count:** `(15 users + 12 videos + 12 reels) = 39 reads` immediately on entering search.

---

## ✍️ Write Operation Characteristics

*   **Chat Messaging:** 2 writes per message (1 `addDoc` to `messages`, 1 `updateDoc/setDoc` to `conversations`).
*   **Like/Follow:** 1 `updateDoc` (item) + 1 `updateDoc` (user) + 1 `addDoc` (notification) = **3 writes per action**.
*   **Comments:** 1 `addDoc` (comment) + 1 `updateDoc` (count) + 1 `addDoc` (notification) = **3 writes per comment**.

---

## 🚫 Future Scalability Warnings
1.  **Array Size Limits:** Following/Followers are stored as arrays in the `users` document. Firestore documents have a **1MB limit**.
    *   If a user follows >10,000 people, the document will exceed 1MB and the app will crash/stop working for that user.
2.  **Snapshot Overload:** 30 conversations in real-time is okay, but if a user has many active groups, the main `ChatsTab` will be constantly re-rendering and re-fetching users.
