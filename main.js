
const { app, BrowserWindow, dialog } = require("electron");
const path = require("node:path");
const fs = require("node:fs");

let mainWindow;
let logPath;

function initializeLogging() {
  try {
    const portableDir = process.env.PORTABLE_EXECUTABLE_DIR;

    // Prefer the portable folder when Electron's portable launcher
    // supplies it. Otherwise, use the normal per-user app data folder.
    const dataDir = portableDir
      ? path.join(portableDir, "ChickenTalkData")
      : path.join(app.getPath("appData"), "ChickenTalk");

    fs.mkdirSync(dataDir, { recursive: true });
    logPath = path.join(dataDir, "startup.log");

    // Keep userData consistent with the selected data directory.
    app.setPath("userData", dataDir);
    writeLog("Logging initialized.");
  } catch (error) {
    console.error("Could not initialize ChickenTalk logging:", error);
  }
}

function writeLog(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  console.log(line.trim());

  if (logPath) {
    try {
      fs.appendFileSync(logPath, line, "utf8");
    } catch (error) {
      console.error("Could not write startup log:", error);
    }
  }
}

function showStartupError(message) {
  writeLog(message);

  dialog.showMessageBox({
    type: "error",
    title: "ChickenTalk could not start",
    message: "ChickenTalk ran into a startup problem.",
    detail: `${message}\n\nA diagnostic log may be available in ChickenTalkData or the ChickenTalk user data folder.`,
    buttons: ["OK"]
  });
}

function createWindow() {
  writeLog("Creating main window.");

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
    (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      if (!isMainFrame) return;

      writeLog(
        `Page load failed: ${errorCode} ${errorDescription}; URL=${validatedURL}`
      );

      if (!mainWindow || mainWindow.isDestroyed()) return;

      dialog.showMessageBox(mainWindow, {
        type: "error",
        title: "ChickenTalk page failed to load",
        message: "ChickenTalk could not load its interface.",
        detail: `${errorDescription}\n\nPlease check the application files and try again.`,
        buttons: ["OK"]
      });
    }
  );

  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    writeLog(`Renderer exited: ${JSON.stringify(details)}`);
  });

  mainWindow.webContents.on("console-message", (_event, details) => {
    if (details.level >= 2) {
      writeLog(`Renderer error: ${details.message}`);
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  const indexPath = path.join(__dirname, "index.html");
  writeLog(`Loading interface from: ${indexPath}`);

  mainWindow.loadFile(indexPath).catch((error) => {
    showStartupError(`Could not load index.html: ${error.stack || error}`);
  });
}

process.on("uncaughtException", (error) => {
  writeLog(`Uncaught exception: ${error.stack || error}`);

  if (app.isReady()) {
    showStartupError(error.message);
  }
});

process.on("unhandledRejection", (error) => {
  writeLog(`Unhandled rejection: ${error?.stack || String(error)}`);
});

app.whenReady().then(() => {
  initializeLogging();
  writeLog(`ChickenTalk starting. Electron ${process.versions.electron}`);

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}).catch((error) => {
  initializeLogging();
  writeLog(`Application startup failed: ${error.stack || error}`);

  if (app.isReady()) {
    showStartupError(error.message);
  } else {
    dialog.showErrorBox(
      "ChickenTalk startup error",
      error.stack || String(error)
    );
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
