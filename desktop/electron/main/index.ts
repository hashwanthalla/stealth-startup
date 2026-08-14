import { app, BrowserWindow } from "electron";
import path from "path";
import { startServer } from "../../server";

const isDev = !app.isPackaged;
let mainWindow: BrowserWindow | null = null;

function initRuntimePaths() {
  const userData = app.getPath("userData");
  process.env.CODEVIZ_DATA_DIR = path.join(userData, "data");
  process.env.CODEVIZ_ENV_FILE = path.join(userData, ".env");

  if (app.isPackaged) {
    process.env.CODEVIZ_TRACER_ROOT = path.join(process.resourcesPath, "tracers");
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 700,
    title: "CodeViz",
    backgroundColor: "#020617",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "../../dist/index.html"));
  }
}

app.whenReady().then(() => {
  initRuntimePaths();
  startServer(3847);
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
