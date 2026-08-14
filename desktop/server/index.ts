import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { loadEnvFile } from "./env";
import { authRoutes } from "./routes/auth";
import { billingRoutes } from "./routes/billing";
import { questionRoutes } from "./routes/questions";
import { visualizeRoutes } from "./routes/visualize";

loadEnvFile();

export function createServer(options?: { serveWeb?: boolean }) {
  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
      },
    })
  );

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "codeviz-api", mode: options?.serveWeb ? "web" : "api" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/billing", billingRoutes);
  app.use("/api/questions", questionRoutes);
  app.use("/api/visualize", visualizeRoutes);

  if (options?.serveWeb) {
    const webDir = path.join(process.cwd(), "dist");
    if (fs.existsSync(webDir)) {
      app.use(express.static(webDir));
      app.get(/^(?!\/api).*/, (_req, res) => {
        res.sendFile(path.join(webDir, "index.html"));
      });
    }
  }

  return app;
}

export function startServer(port = 3847, options?: { serveWeb?: boolean; host?: string }) {
  const app = createServer(options);
  const host = options?.host ?? "0.0.0.0";
  return app.listen(port, host, () => {
    const mode = options?.serveWeb ? "web app" : "API";
    console.log(`CodeViz ${mode} running on http://${host}:${port}`);
  });
}
