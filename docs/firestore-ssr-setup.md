# Firestore + SSR — setup

This is the manual, one-time cloud setup the app depends on but cannot provision
itself. It realizes [ADR 0005](./adr/0005-aulas-no-firestore-com-astro-ssr.md).
The code is already in place; these steps wire it to a real Firebase project.

Since the cutover (issue #27) Firestore is the **single source of truth**: every
Lesson and Course is read from the database and rendered by Astro SSR at
`/courses/<course>/<lesson>` — no `.mdx` file, no build step, no `registry.ts`.
The `.mdx` files stay in git only as the pre-migration snapshot (and as the seed's
input).

## 1. Firebase project (Blaze plan)

App Hosting runs on Cloud Run, so it needs the **Blaze** (pay-as-you-go) plan.

1. Create (or pick) a Firebase project in the console.
2. Upgrade billing to **Blaze**.
3. Enable **Firestore** (Native mode) and create the database.

## 2. Two service accounts, by role (ADR 0005 / 0006)

The web surface is **read-only**; the only writer is the local MCP server.

| Role | Used by | Permission |
| --- | --- | --- |
| Read-only | SSR (this app) | `roles/datastore.viewer` |
| Read/write | MCP server + seed script | `roles/datastore.user` |

For each, create a service account in Google Cloud IAM, grant the role above, and
download a JSON key. Keep both under `secrets/` (git-ignored).

In production, **App Hosting injects the runtime service account** via Application
Default Credentials — no key file is shipped. Grant `roles/datastore.viewer` to the
App Hosting runtime service account and leave `FIRESTORE_SA_KEY` unset there.

## 3. Lock the client out with Security Rules

Only the Admin SDK (server side) should ever touch Firestore. Deny all client
access:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} { allow read, write: if false; }
  }
}
```

## 4. Migrate the content (one shot)

With the **read/write** key, seed every Lesson and Course from the repo's `.mdx`:

```sh
FIRESTORE_ADMIN_KEY=./secrets/admin.sa.json npm run seed:firestore
```

For each Course it writes `courses/{course}` (name, human title from MISSION.md,
order) and one `courses/{course}/lessons/{slug}` per Lesson — Frontmatter promoted
to fields, body as the `mdx` text, and `esbocos[]` from the `registry.ts` snapshot
embedded in the script. Re-running overwrites the same documents (idempotent). The
transform is the tested, pure `readSeedRecords`; the script is just the thin
Firestore-writing adapter around it.

## 5. Run the SSR app locally

With the **read-only** key:

```sh
npm run build
FIRESTORE_SA_KEY=./secrets/readonly.sa.json node ./dist/server/entry.mjs
# visit http://localhost:4321/learnings/ and open any Course → Lesson
```

`astro dev` works the same way once `FIRESTORE_SA_KEY` is exported. The hub and
Course pages list from Firestore; each Lesson renders from the stored `mdx` with
the Preact Catalog and the per-block fallback — proof the circuit is closed.

## 6. Deploy to Firebase App Hosting

1. `firebase init apphosting` (or create a backend in the console) pointed at this
   repo / branch.
2. Ensure the backend's runtime service account has `roles/datastore.viewer`.
3. Push — App Hosting builds Astro (Node adapter, standalone) and serves it on
   Cloud Run. Lesson URLs are public, no login.

## 7. Configure the backup

Firestore is now the single source of truth, so provision the periodic recovery
copy — see [firestore-backup.md](./firestore-backup.md):

```sh
scripts/setup-firestore-backup.sh
```
