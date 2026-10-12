/**
 * Shared comments API — stored in Netlify Blobs (survives deploys).
 * No auth: anyone with the site URL can read/write (team-trust model).
 *
 * GET  → full comments map { "01": [...], ... }
 * PUT  → replace full comments map (body: JSON object)
 */
import { getStore } from "@netlify/blobs";

const STORE = "kea-wireframes";
const KEY = "comments";

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

export default async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("", { status: 204, headers: cors });
  }

  const store = getStore(STORE);

  if (req.method === "GET") {
    const data = (await store.get(KEY, { type: "json" })) || {};
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
    await store.setJSON(KEY, data);
    return json(200, { ok: true });
  }

  return json(405, { error: "method not allowed" });
};

export const config = {
  path: "/api/comments",
};
