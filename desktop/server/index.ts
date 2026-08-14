import express from "express";
import cors from "cors";
import { loadEnvFile } from "./env";
import { authRoutes } from "./routes/auth";
import { billingRoutes } from "./routes/billing";
import { questionRoutes } from "./routes/questions";
import { visualizeRoutes } from "./routes/visualize";

loadEnvFile();

export function createServer() {
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
    res.json({ ok: true, service: "codeviz-api" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/billing", billingRoutes);
  app.use("/api/questions", questionRoutes);
  app.use("/api/visualize", visualizeRoutes);

  return app;
}

export function startServer(port = 3847) {
  const app = createServer();
  return app.listen(port, () => {
    console.log(`CodeViz API running on http://localhost:${port}`);
  });
}
