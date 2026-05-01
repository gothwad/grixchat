# GrixChat

GrixChat is a comprehensive, high-performance social media and real-time messaging application. It combines the features of popular platforms like Instagram and WhatsApp into a single, mobile-first experience.

## 🚀 Key Features

- **Real-time Messaging**: Instant message delivery with read receipts, typing indicators, and message actions (reply, edit, delete).
- **Social Networking**: User profiles, follow system, posts with images/captions, and short-form video content (Reels).
- **Stories & Status**: Share temporary updates with your followers.
- **Advanced Security**: Global App Lock (PIN/Password), privacy settings (hide profile from search, hide photo), and secure authentication.
- **Admin Dashboard**: Comprehensive management tool for monitoring users, posts, and reports.
- **Modern UI/UX**: Clean, zinc-based design with emerald accents, optimized for mobile devices with a centered layout.
- **Presence System**: Real-time online/offline status and "last seen" indicators.
- **Push Notifications**: Integrated browser notifications for new messages and interactions.

## 🛠 Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS 4.
- **State Management**: React Hooks & Context API.
- **Routing**: React Router 7.
- **Backend**: 
  - **Firebase Auth**: Secure user authentication.
  - **Cloud Firestore**: Real-time database for messages, posts, and user data.
  - **Firebase Realtime Database**: Presence tracking and real-time sync.
  - **Express**: Node.js server for API extensions and static hosting.
- **Animations**: Motion (Framer Motion) for fluid transitions.
- **Icons**: Lucide React.

## 🚀 Firebase Optimization Roadmap

To minimize Firestore reads and improve performance, we are implementing:
1. **Conversations Collection**: Moving from message-based chat lists to a dedicated `conversations` collection.
2. **Message Pagination**: Loading only the last 20 messages initially, with "Load More" on scroll.
3. **Unread Count Aggregation**: Storing unread counts in the user document instead of scanning messages.
4. **Message Cleanup**: Keeping only the last 50 messages per chat in Firestore to reduce database size and read costs.

## 📁 Project Structure

- `/src`: Core application logic and main entry points.
- `/screen`: Feature-specific screens (Chat, Reels, Settings, etc.).
- `/tabs`: Main navigation tabs (Chats, Explore, Profile, Status, Calls).
- `/components`: Reusable UI components.
- `/server`: Backend configuration and Express server logic.
- `/admin`: Admin-specific dashboard and tools.
- `/user`: Authentication and profile setup screens.

## 📦 Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Setup**:
   Copy `.env.example` to `.env` and fill in your Firebase configuration.

3. **Run Development Server**:
   ```bash
   npm run dev
   ```

4. **Build for Production**:
   ```bash
   npm run build
   ```

---
Developed with ❤️ by Gothwad Technologies.
