# Starting Fintech Mobile Services

## Prerequisites

- **Node.js**: Ensure Node.js is installed on your system.
- **Terminal Access**: You need a terminal (PowerShell, Command Prompt, or Bash) with access to `npm` and `node`.

## Quick Start (Web)

To start the application in your browser:

1.  Open your terminal in the project root (`E:\fintech-mobile`).
2.  Run the following command:

    ```bash
    npm run web
    ```

    *If `npm` is not in your path, you may need to add it manually or use the full path to `npm.cmd`.*

    **Critical Fix for "npm/node not recognized":**
    If your terminal cannot find node, run this in PowerShell *before* starting:
    ```powershell
    $env:Path = "C:\Program Files\nodejs;" + $env:Path
    ```

    **Alternative Command (Recommended if npm fails):**
    ```bash
    npx expo start --web
    ```

3.  The Metro Bundler will start, and the app should automatically open at `http://localhost:8081`.

## Architecture Overview
This application is currently designed to run **Client-Side Only** for UI development clarity.
- **Data Source**: It uses `services/mockData.js` for initial data.
- **Persistence**: It uses `services/storage.js` to save your changes (Loans, Business settings) to your device's local storage (or browser cache).
- **Backend**: No Python/Node backend server is required to run the mobile app UI.

## Local Environment Notes

### path Configuration
If you encounter "command not found" errors, ensure your system PATH includes the Node.js directory.
Example PowerShell fix:
```powershell
$env:Path = "C:\Program Files\nodejs;" + $env:Path
```

### AsyncStorage Mock
Currently, `@react-native-async-storage/async-storage` is mocked in `components/context/AccessibilityContext.js` to bypass peer dependency installation issues with React 19/Expo 54.
- **Effect**: Settings (Language, Simple Mode) will work for the session but **will not persist** after a reload.
- **Resolution**: This mock should be replaced with the actual package installation once dependency conflicts are resolved.

## Troubleshooting

### "command not found" for npm
If `npm` fails, try using `npx` directly as shown above. If that fails, ensure Node.js is correctly installed and added to your system PATH.
PowerShell Fix:
```powershell
$env:Path = "C:\Program Files\nodejs;" + $env:Path
```

### Port 8081 In Use
If the bundler fails to start because port 8081 is busy:
1.  Find the process: `netstat -ano | findstr :8081`
2.  Kill it (or just let Expo choose a new port, usually 8082).
3.  Watch the terminal output to see which URL it serves (e.g., `http://localhost:8082`).

### 500 Internal Server Error / Application Crash
If the app loads a blank page or 500 error:
1.  Check the terminal for "Bundling failed" errors.
2.  Look for missing dependencies (e.g., `Error: package X not found`).
3.  Run `npm install` to ensure all packages are present.
4.  Restart the server with `npx expo start -c` (Clear Cache).
