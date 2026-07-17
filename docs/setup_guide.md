# 🎯 KidQuest — Developer & Setup Guide

This guide describes how to run, test, and develop the **KidQuest** application entirely on your local machine using the **Firebase Local Emulator Suite**. No external cloud services or API keys are required to get started.

---

## 🛠️ Prerequisites
Make sure you have the following installed on your computer:
1. **Node.js** (v18 or v20+ recommended)
2. **Java Runtime Environment (JRE)** (v11+ required by the Firebase Emulators)
3. **Expo Go app** installed on your iOS/Android phone (if testing on a physical device)

---

## 🚀 Step 1: Install Dependencies
First, install all required dependencies for the monorepo, frontend, and backend cloud functions.

Open a terminal at the project root folder (`c:\KidQuest`) and run:

```bash
# Install root monorepo dependencies
npm install

# Install Frontend dependencies
cd Frontend
npm install

# Install Backend dependencies
cd ../Backend/functions
npm install
```

---

## ⚡ Step 2: Build the Backend Cloud Functions
Before running the emulators, compile the TypeScript source files of the Firebase functions:

```bash
# From repository root
npm run backend:functions:build
```

---

## 🔥 Step 3: Start the Firebase Emulator Suite
Start the local Firebase emulators (Auth, Firestore, Functions, and Storage). We have configured these to run automatically on your local machine.

Run this command from the repository root:
```bash
npm run backend:functions:serve
```

This starts the following local servers:
- **Authentication Emulator:** `127.0.0.1:9098`
- **Firestore Emulator:** `127.0.0.1:8083`
- **Functions Emulator:** `127.0.0.1:5002`
- **Storage Emulator:** `127.0.0.1:9199`
- **Emulator Dashboard:** `http://127.0.0.1:4110` (Open this in your browser to view users and databases visually!)

---

## 📱 Step 4: Start the React Native Frontend
Now, start the Expo developer server for the mobile app:

```bash
# From repository root
npm run frontend:start
```

Once started, Expo will display a QR code in your terminal:
- **Android Physical Device:** Scan the QR code using the **Expo Go** app.
- **Android Emulator / iOS Simulator:** Press `a` or `i` in the terminal to launch the app on your computer's simulator.
- **Web Browser:** Press `w` to run the frontend directly in your web browser.

> [!NOTE]
> The app is configured to automatically detect if you are running in development mode (`__DEV__`). It will dynamically find your computer's IP address and redirect all Firebase operations to your local Firebase Emulator.

---

## 🎓 Step 5: Start the School Portal
To launch the School Portal for teachers, simply open the `school-portal/index.html` file in any web browser. 

You can sign in using the demo admin credentials:
* **Email:** `admin@school.edu`
* **Password:** `password123`

---

## 📂 Key Architecture Features
* **Zero Config Setup:** Default mock values are configured for `.env` to prevent initialization errors in development mode.
* **Offline-Ready:** Custom scripts connect Expo to the local machine's IP address (`expo-constants`), enabling physical devices on the same Wi-Fi network to interact with the local Firebase Emulator.
* **Auto-compilation:** Cloud functions will reload automatically when you make changes and compile them.
