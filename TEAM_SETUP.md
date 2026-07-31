# 🚀 FinTech Mobile — Team Setup Guide

## Prerequisites
Make sure you have the following installed:
- **Node.js** v18+ → https://nodejs.org
- **npm** v9+ (comes with Node.js)
- **Expo CLI** → `npm install -g expo-cli`

---

## 📦 Getting Started

### 1. Install Dependencies
```bash
cd fintech-mobile
npm install
```

### 2. Start the App (Web Browser)
```bash
npx expo start --web
```
Then open **http://localhost:8081** in your browser.

### 3. Start the App (Mobile with Expo Go)
```bash
npx expo start
```
Scan the QR code with the **Expo Go** app on your phone.

---

## 🧪 Testing

### Run Backend Tests
```bash
cd backend
pip install -r requirements.txt
python -m pytest
```

### Seed Demo Data (in the app)
Go to **Settings → Developer → Seed Demo Data** inside the app to load sample data for all modules.

---

## 📁 Project Structure

```
fintech-mobile/
├── app/              # Screen components (Expo Router)
│   ├── (tabs)/       # Bottom navigation tabs
│   ├── business/     # Business module screens (7 types)
│   └── ...
├── components/       # Reusable UI components
├── services/         # Business logic & data services
├── config/           # App configuration
├── constants/        # Static values & themes
├── assets/           # Images, fonts, icons
├── backend/          # Python FastAPI backend
└── docs/             # Documentation & analysis
```

---

## 🏢 Business Modules
The app includes 7 business type modules:
| Module | Description |
|--------|-------------|
| **Retail** | Inventory + billing (POS) |
| **Restaurant** | Menu, KDS, reservations |
| **Service** | Appointments, client management |
| **Manufacturing** | Production batches, OEE |
| **Hospitality** | Room bookings, RevPAR |
| **Transportation** | Fleet tracking, deliveries |
| **Rental Property** | Tenant management, rent collection |

---

## ⚙️ Environment
No `.env` file is required for the frontend.  
For backend, copy `.env.example` to `.env` (if applicable).

---

## 📞 Issues?
Contact the project lead or open an issue on the repo.
