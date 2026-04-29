# 🎯 KidQuest — Kids Routine & Academic Management App

> A cross-platform mobile application built with React Native and Firebase to help students manage daily routines, track academic progress, and stay organized — with a companion school portal for teachers.

![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![NativeWind](https://img.shields.io/badge/NativeWind-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)

---

## ✨ What is KidQuest?

KidQuest is a mobile-first productivity app designed for school students. It helps kids build healthy daily habits, track academic tasks, and stay on top of their routines — all in one place. A companion **School Portal** allows teachers to manage and monitor student progress.

---

## 🚀 Key Features

| Feature | Description |
|---|---|
| 📅 **Daily Routine Tracker** | Students can set and track daily tasks and habits |
| 📚 **Academic Progress** | Subject-wise task tracking and completion monitoring |
| 🔔 **Push Notifications** | Expo Notifications for reminders and alerts |
| 🗣️ **Text-to-Speech** | Expo Speech integration for audio task reading |
| 📸 **Image Uploads** | Expo Image Picker for profile and assignment photos |
| 🏫 **School Portal** | Dedicated teacher/admin portal for student management |
| 📱 **Offline Support** | AsyncStorage for local data persistence |
| 🎨 **Modern UI** | NativeWind (Tailwind CSS) + Linear Gradient + Haptics |

---

## 🛠️ Tech Stack

```
Language        : TypeScript
Framework       : React Native (Expo SDK 54)
Routing         : Expo Router (file-based)
Database        : Firebase Firestore
Auth            : Firebase Auth
State           : Zustand
Styling         : NativeWind (Tailwind CSS for RN)
Navigation      : React Navigation (Bottom Tabs)
Notifications   : Expo Notifications
Speech          : Expo Speech
Animations      : React Native Reanimated
```

---

## 📁 Project Structure

```
KidQuest/
├── app/                  # Expo Router pages (file-based routing)
│   ├── (tabs)/           # Bottom tab screens
│   ├── _layout.tsx       # Root layout
│   └── index.tsx         # Entry screen
├── components/           # Reusable UI components
├── constants/            # Theme colors, fonts, config
├── hooks/                # Custom React hooks
├── lib/                  # Firebase setup & utilities
├── services/             # Firestore API calls & business logic
├── store/                # Zustand global state management
├── school-portal/        # Teacher/admin web portal
├── assets/images/        # App images and icons
├── firestore.rules       # Firebase security rules
├── storage.rules         # Firebase storage rules
├── tailwind.config.js    # NativeWind configuration
└── app.json              # Expo configuration
```

---

## ⚡ Getting Started

### Prerequisites
- Node.js v18+
- Expo CLI
- Firebase project ([console.firebase.google.com](https://console.firebase.google.com))
- Expo Go app on your phone

### Installation

```bash
# Clone the repo
git clone https://github.com/amar-kumar-cse/KidQuest.git
cd KidQuest

# Install dependencies
npm install

# Setup Firebase config in lib/firebase.ts
# Add your Firebase project credentials

# Start the app
npx expo start
```

### Run on Device
```bash
npx expo start --android   # Android
npx expo start --ios       # iOS
npx expo start --web       # Web browser
```

Scan the QR code with **Expo Go** app to run on your phone instantly.

---

## 🔥 Firebase Setup

1. Create a project at [Firebase Console](https://console.firebase.google.com)
2. Enable **Firestore Database** and **Authentication**
3. Add your config to `lib/firebase.ts`:

```typescript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

---

## 🗺️ Roadmap

- [x] Daily routine tracker
- [x] Firebase Firestore integration
- [x] Push notifications
- [x] School portal for teachers
- [x] NativeWind UI
- [ ] Gamification — badges and rewards
- [ ] Parent dashboard
- [ ] AI-powered study suggestions

---

## 👨‍💻 Author

**Amar Kumar**
- 🔗 GitHub: [@amar-kumar-cse](https://github.com/amar-kumar-cse)
- 💼 LinkedIn: [linkedin.com/in/amarkumarr](https://linkedin.com/in/amarkumarr)
- 📧 Email: amarkrydav@gmail.com

---

## ⭐ Drop a star if you find this helpful! 🙏
