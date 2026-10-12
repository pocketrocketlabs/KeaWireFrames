#!/usr/bin/env node
/**
 * Serve wireframes + shared comments API (no auth).
 *   node serve.mjs
 *   → http://localhost:8765/kea_mockup.html
 *   → http://localhost:8765/parent_mockup.html
 *
 * Comments scopes (separate files so child/parent don't overwrite):
 *   GET/PUT /api/comments              → comments.json
 *   GET/PUT /api/comments?scope=parent → comments-parent.json
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8765);
const ROOT = __dirname;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
};

function commentsPath(scope) {
  return path.join(
    ROOT,
    scope === "parent" ? "comments-parent.json" : "comments.json"
  );
}

function readComments(scope) {
  try {
    const raw = fs.readFileSync(commentsPath(scope), "utf8");
    const data = JSON.parse(raw);
    return data && typeof data === "object" && !Array.isArray(data) ? data : {};
  } catch {
    return {};
  }
}

function writeComments(scope, data) {
  fs.writeFileSync(commentsPath(scope), JSON.stringify(data, null, 2) + "\n", "utf8");
}

function send(res, status, body, type = "application/json; charset=utf-8") {
  const buf = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(buf);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > 2_000_000) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const clean = path.normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const full = path.join(ROOT, clean);
  if (!full.startsWith(ROOT)) return null;
  return full;
}

function resolveScope(url) {
  const s = (url.searchParams.get("scope") || "child").toLowerCase();
  return s === "parent" ? "parent" : "child";
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    return send(res, 204, "");
  }

  if (url.pathname === "/api/comments") {
    const scope = resolveScope(url);
    if (req.method === "GET") {
      return send(res, 200, readComments(scope));
    }
    if (req.method === "PUT") {
      try {
        const raw = await readBody(req);
        const data = JSON.parse(raw || "{}");
        if (!data || typeof data !== "object" || Array.isArray(data)) {
          return send(res, 400, { error: "expected object map of frameId → comments[]" });
        }
        writeComments(scope, data);
        return send(res, 200, { ok: true, scope });
      } catch (e) {
        return send(res, 400, { error: String(e.message || e) });
      }
    }
    return send(res, 405, { error: "method not allowed" });
  }

  let filePath = safePath(url.pathname === "/" ? "/kea_mockup.html" : url.pathname);
  if (!filePath) return send(res, 403, { error: "forbidden" });

  fs.stat(filePath, (err, st) => {
    if (err || !st.isFile()) {
      return send(res, 404, { error: "not found" });
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-cache" });
    fs.createReadStream(filePath).pipe(res);
  });
});

for (const scope of ["child", "parent"]) {
  const p = commentsPath(scope);
  if (!fs.existsSync(p)) writeComments(scope, {});
}

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Child  → http://localhost:${PORT}/kea_mockup.html`);
  console.log(`Parent → http://localhost:${PORT}/parent_mockup.html`);
  console.log(`API    → http://localhost:${PORT}/api/comments[?scope=parent]`);
});
