#!/usr/bin/env node

const { downloadArtifact } = require("@electron/get");
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");
const electronDir = path.join(rootDir, "node_modules", "electron");
const distDir = path.join(electronDir, "dist");
const pathFile = path.join(electronDir, "path.txt");
const { version } = require(path.join(electronDir, "package.json"));

const platformPath =
  process.platform === "darwin"
    ? "Electron.app/Contents/MacOS/Electron"
    : process.platform === "win32"
      ? "electron.exe"
      : "electron";

const binaryPath = path.join(distDir, platformPath);
const frameworkPath = path.join(
  distDir,
  "Electron.app/Contents/Frameworks/Electron Framework.framework/Electron Framework"
);

function isHealthyInstall() {
  if (!fs.existsSync(binaryPath)) return false;
  if (process.platform === "darwin" && !fs.existsSync(frameworkPath)) return false;
  if (!fs.existsSync(pathFile)) return false;
  return fs.readFileSync(pathFile, "utf8").trim() === platformPath;
}

async function installElectron() {
  if (isHealthyInstall()) {
    return;
  }

  const arch = process.arch === "x64" && process.platform === "darwin" ? "arm64" : process.arch;

  console.log(`Installing Electron ${version} for ${process.platform}-${arch}...`);
  const zipPath = await downloadArtifact({
    version,
    artifactName: "electron",
    platform: process.platform,
    arch,
    force: true,
  });

  await fs.promises.rm(distDir, { recursive: true, force: true });
  await fs.promises.mkdir(distDir, { recursive: true });

  const unzip = spawnSync("unzip", ["-q", zipPath, "-d", distDir], { stdio: "inherit" });
  if (unzip.status !== 0) {
    throw new Error(`Failed to extract Electron archive (exit ${unzip.status})`);
  }

  await fs.promises.writeFile(pathFile, platformPath);

  if (!fs.existsSync(binaryPath)) {
    throw new Error(`Electron binary missing at ${binaryPath}`);
  }
  if (process.platform === "darwin" && !fs.existsSync(frameworkPath)) {
    throw new Error(`Electron framework missing at ${frameworkPath}`);
  }

  console.log("Electron installed successfully.");
}

installElectron().catch((error) => {
  console.error(error);
  process.exit(1);
});
