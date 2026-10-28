
const { app } = require("electron");
const path = require("path");
const fs = require("fs");

// ChickenTalk portable mode
// Store application data beside the app's executable.
if (app.isPackaged) {
  const portableData = path.join(
    path.dirname(process.execPath),
    "ChickenTalkData"
  );

  fs.mkdirSync(portableData, { recursive: true });
  app.setPath("userData", portableData);
}

// Export the path for other Electron modules if needed.
module.exports = {
  getPortableDataPath() {
    if (app.isPackaged) {
      return path.join(
        path.dirname(process.execPath),
        "ChickenTalkData"
      );
    }

    return path.join(__dirname, "ChickenTalkData");
  }
};
