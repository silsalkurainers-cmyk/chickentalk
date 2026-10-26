
const { app, BrowserWindow, dialog } = require("electron");
const path = require("node:path");
const fs = require("node:fs");

let mainWindow;
let logFile;

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}`;

  console.log(line);

  if (logFile) {
    try {
      fs.appendFileSync(logFile, line + "\n", "utf8");
    } catch {}
  }
}

function initializeApp() {
  // Keep app data in the user's writable AppData directory.
  // This works for portable EXEs and normal installations.
  const dataDir = path.join(app.getPath("appData"), "ChickenTalk");

  try {
    fs.mkdirSync(dataDir, { recursive: true });
    logFile = path.join(dataDir, "startup.log");
    app.setPath("userData", dataDir);
  } catch (error) {
    console.error("Could not initialize app data:", error);
  }
}

function showError(title, message) {
  log(`${title}: ${message}`);

  dialog.showMessageBox({
    type: "error",
    title,
    message,
    detail: message,
    buttons: ["OK"]
  });
}

function createWindow() {
  const indexPath = path.join(app.getAppPath(), "index.html");

  log(`App path: ${app.getAppPath()}`);
  log(`Index path: ${indexPath}`);
  log(`Index exists: ${fs.existsSync(indexPath)}`);

  if (!fs.existsSync(indexPath)) {
    showError(
      "ChickenTalk could not start",
      `The interface file is missing:\n${indexPath}\n\nPlease download a fresh copy of ChickenTalk.`
    );
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 700,
    minHeight: 500,
    title: "ChickenTalk",
    backgroundColor: "#080b08",
    autoHideMenuBar: true,
    show: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.webContents.on(
    "did-fail-load",
    (_event, code, description, url, isMainFrame) => {
      if (!isMainFrame || code === -3) return;

      log(`Load failure ${code}: ${description}; URL=${url}`);

      if (mainWindow && !mainWindow.isDestroyed()) {
        showError(
          "ChickenTalk could not load",
          `${description}\n\nPlease try downloading ChickenTalk again.`
        );
      }
    }
  );

  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    log(`Renderer stopped: ${JSON.stringify(details)}`);
  });

  mainWindow.webContents.on("console-message", (_event, details) => {
    if (details.level >= 2) {
      log(`Interface error: ${details.message}`);
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.loadFile(indexPath).catch((error) => {
    showError(
      "ChickenTalk could not open its interface",
      error.stack || error.message || String(error)
    );
  });

  mainWindow.show();
}

process.on("uncaughtException", (error) => {
  log(`Uncaught exception: ${error.stack || error}`);

  if (app.isReady()) {
    showError("ChickenTalk encountered an error", error.message);
  }
});

process.on("unhandledRejection", (error) => {
  log(`Unhandled rejection: ${error?.stack || String(error)}`);
});

app.whenReady().then(() => {
  initializeApp();
  log(`Starting ChickenTalk; Electron ${process.versions.electron}`);

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}).catch((error) => {
  dialog.showErrorBox(
    "ChickenTalk startup failed",
    error.stack || String(error)
  );
  app.quit();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
