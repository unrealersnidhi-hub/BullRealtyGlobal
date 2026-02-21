import { createReadStream, existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { createServer } from "node:http";

const PORT = Number(process.env.PORT || 3000);
const DIST_DIR = join(process.cwd(), "dist");
const INDEX_FILE = join(DIST_DIR, "index.html");

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function sendFile(filePath, res) {
  const extension = extname(filePath).toLowerCase();
  res.statusCode = 200;
  res.setHeader("Content-Type", MIME_TYPES[extension] || "application/octet-stream");
  createReadStream(filePath).pipe(res);
}

const server = createServer((req, res) => {
  const urlPath = (req.url || "/").split("?")[0];
  const safePath = normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
  let filePath = join(DIST_DIR, safePath);

  if (urlPath === "/" || !existsSync(filePath)) {
    filePath = INDEX_FILE;
  }

  if (existsSync(filePath)) {
    sendFile(filePath, res);
    return;
  }

  res.statusCode = 404;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end("Not Found");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
