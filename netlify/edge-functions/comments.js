/**
 * Edge comments API — closer to users than Node functions; Blobs still persist.
 * GET/PUT /api/comments[?scope=parent]
 */
import { getStore } from "@netlify/blobs";

const STORE = "kea-wireframes";
const mem = { child: null, parent: null, childAt: 0, parentAt: 0 };
const MEM_TTL_MS = 2500;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(status, body, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors,
      "Content-Type": "application/json; charset=utf-8",
      ...extra,
    },
  });
}

function blobKey(scope) {
  return scope === "parent" ? "comments-parent" : "comments";
}

function resolveScope(req) {
  try {
    const s = (new URL(req.url).searchParams.get("scope") || "child").toLowerCase();
    return s === "parent" ? "parent" : "child";
  } catch {
    return "child";
  }
}

export default async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("", { status: 204, headers: cors });
  }

  const scope = resolveScope(req);
  const key = blobKey(scope);
  const store = getStore(STORE);

  if (req.method === "GET") {
    const now = Date.now();
    const cached = mem[scope];
    const at = scope === "parent" ? mem.parentAt : mem.childAt;
    if (cached && now - at < MEM_TTL_MS) {
      return json(200, cached, {
        "Cache-Control": "public, max-age=2, stale-while-revalidate=15",
        "X-Comments-Cache": "mem",
      });
    }
    const data = (await store.get(key, { type: "json" })) || {};
    mem[scope] = data;
    if (scope === "parent") mem.parentAt = now;
    else mem.childAt = now;
    return json(200, data, {
      "Cache-Control": "public, max-age=2, stale-while-revalidate=15",
      "X-Comments-Cache": "blob",
    });
  }

  if (req.method === "PUT") {
    let data;
    try {
      data = await req.json();
    } catch {
      return json(400, { error: "invalid JSON body" });
    }
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return json(400, { error: "expected object map of frameId → comments[]" });
    }
    await store.setJSON(key, data);
    mem[scope] = data;
    if (scope === "parent") mem.parentAt = Date.now();
    else mem.childAt = Date.now();
    return json(200, { ok: true, scope }, { "Cache-Control": "no-store" });
  }

  return json(405, { error: "method not allowed" });
};
