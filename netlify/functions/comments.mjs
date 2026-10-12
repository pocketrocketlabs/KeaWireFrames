/**
 * Shared comments API — Netlify Blobs (survives deploys).
 * No auth (team-trust).
 *
 * GET/PUT /api/comments              → blob key "comments" (child)
 * GET/PUT /api/comments?scope=parent → blob key "comments-parent"
 */
import { getStore } from "@netlify/blobs";

const STORE = "kea-wireframes";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8" },
  });
}

function blobKey(scope) {
  return scope === "parent" ? "comments-parent" : "comments";
}

function resolveScope(req) {
  try {
    const url = new URL(req.url);
    const s = (url.searchParams.get("scope") || "child").toLowerCase();
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
    const data = (await store.get(key, { type: "json" })) || {};
    return json(200, data);
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
    return json(200, { ok: true, scope });
  }

  return json(405, { error: "method not allowed" });
};

export const config = {
  path: "/api/comments",
};
