# Accessibility & Inclusivity Walkthrough

## Overview
We have implemented a comprehensive system for Accessibility and Inclusivity to ensure the app serves all users, including those with low literacy, visual impairments, or language barriers.

## Features Implemented

### 1. Multi-Language Support (15+ Languages)
- **Infrastructure**: Created `AccessibilityContext` and `translations.js` to handle dynamic language switching.
- **Languages Supported**: English, Hindi, Bengali, Telugu, Marathi, Tamil, Urdu, Gujarati, Kannada, Malayalam, Odia, Punjabi, Assamese, Maithili, Santali.
- **Usage**: Users can select their preferred language from Settings. The dashboard instantly reflects the change for key terms.

### 2. Simple Mode (Elderly Friendly)
- **Toggle**: Available in Settings.
- **Effect**: Increases font sizes for key metrics (Balance, Income, Expenses) on the Dashboard.
- **UI**: Simplifies the Settings interface itself when enabled, using larger icons and text.

### 3. Voice & Audio
- **Toggle**: Users can enable "Voice Commands" (placeholder for future voice input).
- **Text-to-Speech**: Infrastructure (`speak` function) added to Context to support reading out text for illiterate users.

### 4. Data & Connectivity
- **Offline Mode**: Toggle to simulate or force offline behavior (saving data locally).
- **Low Data Mode**: Toggle to reduce data usage (can be hooked up to image loading logic).

### 5. Color Blind Mode
- **Toggle**: Added specialized High Contrast / Color Blind friendly mode preference.

## Files Created/Modified
- `components/context/AccessibilityContext.js`: Core state management.
- `components/context/translations.js`: Dictionary for 15 languages.
- `app/settings.js`: New settings screen with accessibility controls.
- `app/_layout.js`: Wrapped application in `AccessibilityProvider`.
- `app/(tabs)/index.js`: Updated Dashboard to demonstrate dynamic translation and font scaling.

## How to Test
1. Go to the **More** tab.
2. Tap **Settings**.
3. Toggle **Simple Mode** -> Go back to Dashboard -> Observe larger fonts.
4. Tap **Language** -> Select **Hindi** -> Go back to Dashboard -> Observe "Total Balance" changing to "कुल शेष".
