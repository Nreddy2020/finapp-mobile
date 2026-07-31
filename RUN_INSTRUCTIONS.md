# How to Run the Fintech Mobile App

## 1. Open Terminal
Open a terminal (PowerShell or Command Prompt) and navigate to the project folder:
`E:\fintech-mobile`

## 2. Start the App Service
Run the following command to start the server:

```bash
npm run web
```

*Note: If you see "command not found", you may need to add Node.js to your path or use the full path to npm.*

## 3. Access the Application
Once the server is running (you will see "Starting Metro Bundler"), open Google Chrome and visit:

**[http://localhost:8081](http://localhost:8081)**

---

### Troubleshooting (Windows)
If the `npm` command is not recognized, try running this command in PowerShell first:

```powershell
$env:Path = "C:\Program Files\nodejs;" + $env:Path
npm run web
```
