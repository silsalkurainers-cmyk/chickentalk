const { app, BrowserWindow, dialog } = require("electron");
const path = require("node:path");
const fs = require("node:fs");

const isPortable = Boolean(process.env.PORTABLE_EXECUTABLE_DIR);
const portableDirectory = isPortable
  ? process.env.PORTABLE_EXECUTABLE_DIR
  : path.dirname(process.execPath);

const dataDirectory = path.join(portableDirectory, "ChickenTalkData");

try {
  fs.mkdirSync(dataDirectory, { recursive: true });
  app.setPath("userData", dataDirectory);
} catch (error) {
  console.error("Could not create portable data folder:", error);
  app.setPath(
    "userData",
    path.join(app.getPath("appData"), "ChickenTalk")
  );
}

let mainWindow;

function writeLog(message) {
  try {
    const logPath = path.join(app.getPath("userData"), "startup.log");
    fs.appendFileSync(
      logPath,
      `[${new Date().toISOString()}] ${message}\n`
    );
  } catch (error) {
    console.error("Logging failed:", error);
  }
}

function createWindow() {
  writeLog("Creating ChickenTalk window.");

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 700,
    minHeight: 500,
    title: "ChickenTalk",
    backgroundColor: "#080b08",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    writeLog("Window displayed successfully.");
  });

  mainWindow.webContents.on("did-fail-load", (_event, code, description, url) => {
    writeLog(`Page load failed: ${code} ${description} URL=${url}`);
  });

  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    writeLog(`Renderer exited: ${JSON.stringify(details)}`);
  });

  mainWindow.webContents.on("console-message", (_event, details) => {
    if (details.level >= 2) {
      writeLog(`Renderer console error: ${details.message}`);
    }
  });

  mainWindow.loadFile(path.join(__dirname, "index.html")).catch((error) => {
    writeLog(`Could not load index.html: ${error.stack || error}`);

    dialog.showErrorBox(
      "ChickenTalk failed to start",
      `Could not load index.html.\n\n${error.message}`
    );
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

process.on("uncaughtException", (error) => {
  writeLog(`Uncaught exception: ${error.stack || error}`);
});

process.on("unhandledRejection", (error) => {
  writeLog(`Unhandled rejection: ${String(error)}`);
});

app.whenReady().then(() => {
  writeLog(`ChickenTalk starting. Electron ${process.versions.electron}`);
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}).catch((error) => {
  writeLog(`Application startup failed: ${error.stack || error}`);
  dialog.showErrorBox("ChickenTalk startup error", String(error));
  app.quit();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
