import path from "path";
import { startServer } from "./index";

const port = Number(process.env.PORT ?? 8080);

if (!process.env.CODEVIZ_DATA_DIR) {
  process.env.CODEVIZ_DATA_DIR = path.join(process.cwd(), "data");
}

if (!process.env.CODEVIZ_TRACER_ROOT) {
  process.env.CODEVIZ_TRACER_ROOT = path.join(process.cwd(), "server");
}

startServer(port, { serveWeb: true, host: "0.0.0.0" });
