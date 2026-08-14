import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("codeviz", {
  platform: process.platform,
  apiBaseUrl: "http://localhost:3847/api",
});
