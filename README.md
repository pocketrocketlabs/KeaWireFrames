# KeaWireFrames

Child-app wireframes (Chat + Tutor) with **shared comments** (no login).

- **Git** = HTML / layouts (versioned)
- **Netlify Blobs** = comments (survive redeploys; **not** in git)

## Local

```bash
npm install
npm run serve:local          # http://localhost:8765  (comments → comments.json, gitignored)
# or, closer to prod:
npx netlify dev              # uses the Blobs-backed function locally
```

Open `/kea_mockup.html`. Footer should say `comments · shared` when the API is up.

## Netlify setup (first time)

### 1. Push this repo

Ensure `main` on GitHub has at least: `kea_mockup.html`, `netlify.toml`, `netlify/functions/`, `package.json`.

Do **not** commit `comments.json` (it’s gitignored).

### 2. Create / link the site

1. Go to [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project**
2. Choose **GitHub** → authorize if needed → select **`pocketrocketlabs/KeaWireFrames`**
3. Build settings:
   - **Branch:** `main`
   - **Build command:** leave **empty** (or `echo skip`)
   - **Publish directory:** `.` (or leave blank if Netlify reads `netlify.toml`)
4. Click **Deploy site**

`netlify.toml` already sets publish dir + functions folder.

### 3. Blobs (no extra toggle)

Blobs are available automatically when a Function calls `getStore(...)`.  
After the first successful deploy:

1. Open the site → **Logs** / **Functions** → confirm `comments` deployed
2. Visit your site URL → open a frame’s **Comments** → post with your name
3. Footer should show **`comments · shared`**
4. **Redeploy** (or push a tiny HTML change) → refresh → comment should still be there

Optional: in the Netlify UI, under the site, look for **Blobs** / storage to inspect keys (`store: kea-wireframes`, key: `comments`).

### 4. Custom domain (optional)

**Domain management** → Add domain / Netlify subdomain is fine for team sharing.

### 5. Day-to-day updates

```bash
# edit kea_mockup.html …
git add -A && git commit -m "…" && git push
```

Netlify redeploys the HTML. Comments stay in Blobs.

## API

| Method | Path | Body |
|--------|------|------|
| `GET` | `/api/comments` | — → `{ "01": [ { id, name, text, createdAt, updatedAt } ] }` |
| `PUT` | `/api/comments` | full map (same shape) |

No auth. Anyone with the URL can edit/delete (team trust).

## Note on Deploy Previews

Site-wide Blobs (`getStore`) are shared across production and Deploy Previews. Preview traffic can change the same comments as prod. Fine for an internal design review board; don’t use this pattern for user PII.
