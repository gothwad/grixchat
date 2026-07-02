# GrixChat Developer & AI Agent Guidelines (System Instructions)

This file contains the strict development, architectural, and design constraints for GrixChat. As an AI Agent, you **must** read and adhere to these guidelines during every turn.

---

## 1. Core Architectural Blueprint
* **Backend, Database, Storage, and Sync:** Built **100% on Supabase**. Do not introduce any secondary server-side database stores or standard polling endpoints unless explicit.
* **Push Notifications:** **Firebase Cloud Messaging (FCM)** is strictly used *only* for native background notification delivery. No other Firebase features (Auth, Firestore, Storage) should be used.
* **Calling & Streaming:** Web RTC signaling is managed through lightweight Supabase channels. Keep media channels clean.
* **Platform Delivery:** Deployed primarily as an **Advanced Native Android WebView wrapper** running bi-directional Javascript Bridges (`AndroidJSInterface`).
  * Features custom native integrations (custom native splash screen, native FCM background delivery, native permission prompts for camera/mic/WebRTC, and custom offline screens).
  * The UX must feel completely native.
  * Use safe-area paddings for navigation bars/status headers (`pb-[safe]`, `h-[100dvh]` dynamic viewport sizing to prevent mobile browser scroll bouncing).
  * Hover events must gracefully degrade, and touch targets must be minimum `44px` on mobile wrappers.

---

## 2. Ultra-Low Costs & Egress Optimization (50k Free-Plan Mandate)
To comfortably support more than 50k users on Supabase's free tier, database operations and API calls must be kept highly optimized:

### A. Real-time Subscription Safeguards
* **No Unfiltered Postgres Listeners:** Never listen to entire tables globally. A subscriber must always filter listeners to their own active context:
  * ❌ *Bad (High Egress):* `.on('postgres_changes', { table: 'follows' })`
  * ✅ *Good (Filtered):* `.on('postgres_changes', { table: 'follows', filter: 'follower_id=eq.' + userId })`
* **Transients via Broadcast Channels:** Use lightweight WebSocket broadcasts instead of standard database inserts for highly transient actions (such as real-time typing indicators, active call signaling, online presence updates, and read confirmations). This retains a 0B database egress load.
* **Consolidated Tab Bars:** Never poll the database to update message feeds or list indicators across background screens. Listen directly to local cache updates from the `LocalDataCache` inside global headers and bottom navigation controllers.

### B. Intelligent Rendering & Caching
* **Offline Cache (`LocalDataCache`):** Always write conversational states dynamically to local storage/local memory cache. Feed views locally before loading the network.
* **Pruning and Batch Counts:** Keep initial load ranges restricted (e.g., paging size of `20-30` messages). Automatically prune deep DOM elements and maintain clean lists to minimize local runtime footprint.

---

## 3. UI Design & UX Mix
GrixChat has a highly polished, aesthetic modern visual blend:
* **20% Telegram:** Micro-animations (`motion/react`), high velocity, clean chat bubble swipe gestures, dynamic typing feedback running instantly under avatars.
* **20% WhatsApp:** Simple, intuitive messaging mechanics:
  * **Message Ticks:** Live delivery state visually synced:
    * `✓` **Single Tick (Gray):** Message sent securely.
    * `✓✓` **Double Tick (Gray):** Message delivered (Recipient is online).
    * `✓✓` **Blue Tick:** Message read by recipient.
  * **Selection Highlight Aesthetic:** Selecting chats in selection mode changes background shade and adds an elegant left-colored border (`border-l-[4px] border-l-[var(--primary)] text-[var(--primary)]/10`) instead of displaying intrusive checkboxes or moving the avatar block.
  * **Header Context Menu:** All bulk action bars (archives, deletes, mutes) reside cleanly inside the `TabHeader` to keep the bottom navigation bar neat and clutter-free.
* **60% Unique Identity:** Elegant Dark Cosmic theme styled with deep charcoal tones, rich borders, bold Display typography (Space Grotesk, Inter), and customizable UI gradients.

---

## 4. Code Structuring Rules
* Keep code modular. Do not bloat files like `App.tsx` or `ChatScreen.tsx`. Extract helpers, individual sheets, and custom tabs to independent folders.
* Always execute `/src` actions with high type-safety using standard standard TypeScript types and strictly avoid compiling failures.
* **SQL Registry Structure:** All database schemas, incremental migration updates, row-level security (RLS) definitions, triggers, and indices must be kept updated and strictly stored inside the `/sql` folder at the root level. Running developers/AI agents must keep the `/sql` directory perfectly updated at all times.

---

## 5. Enterprise-Scale Folder Structure & Architecture (100-Score Blueprint)
To scale seamlessly from a prototype to a massive enterprise application managing thousands of files without cognitive overload or structural visual bleed, GrixChat implements a **Feature-Driven Domain Architecture** with strict layer boundaries.

### A. Architectural Evaluation Matrix
Our standard rating scale assesses structural health across five key dimensions:
1. **Modularity & Isolation (Feature-Slicing):** Feature modules (`src/features/*`) must be fully self-contained. Any cross-feature interaction must happen via shared interfaces or explicit public APIs.
2. **Layer Separation (Presentation vs. Business Logic):** Views and JSX layers should be purely declarative. Async side effects, data caching, database hydration, and sync streams must reside strictly inside custom custom hooks (`hooks/`) or dedicated services (`services/`).
3. **Circular Dependency Safeguards:** Direct relative imports between different sibling feature modules (e.g., `features/chat/` directly importing from `features/call/`) are major anti-patterns. They must import from shared abstractions (`src/components/`, `src/services/`, or `src/types/`).
4. **Cache & Persistence Integrity:** Local offline caching engines (IndexedDB/State controllers) must reside wholly separated from presentation components to allow clean data layers.
5. **Type Preservation:** Explicit shared global interfaces (`src/types/`) and domain-level contract shapes must govern compiled flows (No loose `any` declarations or ad-hoc casting).

### B. Standardized Directory Layout (Enterprise Scale)
This structured layout groups concerns clearly and defines strict nesting limits:

```text
/src
├── App.tsx                    # Main App entry with global router configs
├── main.tsx                   # Client-side bootstrap
├── index.css                  # Tailwinds design parameters & custom theme configurations
├── types/                     # Global data models, database structures, and platform declarations
│   ├── index.ts               # Bundled type exports
│   └── database.types.ts      # Strictly typed schema definitions matching Supabase Postgres
├── config/                    # Global configuration setups
│   └── supabase.ts            # Client client authorizations
├── lib/                       # Third-party SDK client setups (Supabase, WebRTC adapters)
│   └── supabase.ts
├── providers/                 # Global React Context providers (Auth, Calls, Theme, Realtime Indicators)
│   ├── AuthProvider.tsx
│   └── CallProvider.tsx
├── services/                  # Global enterprise service layer (Singletons handling state & cross-feature actions)
│   ├── LocalDataCache.ts      # Active fast memory cache mapping IndexedDB transactions
│   ├── IndexedDBService.ts    # Durable persistent Web SQL / IndexedDB client backplane
│   ├── AIService.ts           # Offline/Online AI interface syncing with Grix AI bot
│   └── StorageService.ts      # Standardized secure local client disk storage interface
├── utils/                     # Pure, stateless utility functions (date parsers, token validators)
│   └── scheduleUtils.ts       # Time math calculations
├── components/                # Global UI components shared across multiple feature modules
│   ├── common/                # Universal visual atoms (Buttons, Spinners, InputFields)
│   ├── layout/                # Global Shell Frames (Desktop Welcomes, Sidebars, Bottom Nav Bars)
│   └── chat-ui/               # Reusable chat layout wrappers and shared modals
└── features/                  # Domain-driven feature domains (100% Isolated Modular Core Slices)
    ├── auth/                  # User lifecycle authentication, profiles signup, setup screens
    │   ├── components/        # Isolated Signup / Login sub-components
    │   ├── hooks/             # Custom authentication state controllers
    │   └── services/          # Pure Auth API helpers
    ├── chat/                  # Messaging flows, list directories, drafts, chat logs, groups, settings
    │   ├── components/        # ChatUserList, ChatMessageRow, MessagesList
    │   ├── hooks/             # useChatSync, useConversations, useChatId
    │   └── services/          # pushNotificationService, messageRequestService
    ├── call/                  # Call Screen, signaling states, active active ringings, call history logs
    │   ├── components/        # CallsHistoryList, CallRingUI, CallFloatingHeader
    │   ├── hooks/             # useCalls, useActiveCallTimer
    │   └── services/          # CallSyncService
    ├── profile/               # User bio editors, blocked accounts, custom user profile sheets
    │   ├── components/
    │   └── services/
    ├── search/                # Universal dynamic search indices (finding contacts, messages, calls)
    └── settings/              # App configuration, security presets, active device controllers, deletes
```

### C. Import Restrictions & Integrity Policies
1. **The Sandbox Rule:** Every subfolder inside `features/` should be designed as a miniature self-contained package.
2. **Relative Sibling Imports are Strictly Forbidden:** Sibling features cannot import from each other via relative paths like `../../call/hooks/useCalls`. Instead, if data is needed, compile it via global service layers or providers.
3. **No Unstructured Base Bloats:** Avoid creating files with multiple different classes and hook controllers. Always split complex views into logical sub-components (e.g. `ChatUserList.tsx` rendering isolated components like `GrixAIRow`).
