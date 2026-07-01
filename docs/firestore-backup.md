# Firestore backup — periodic recovery copy

Since the cutover ([issue #27](../blob/main/docs/adr/0005-aulas-no-firestore-com-astro-ssr.md)),
Firestore is the **single source of truth** for Lessons and Courses. The `.mdx`
files remain in git only as the pre-migration snapshot, and the write loop (the
local MCP server) never commits — so recovery does **not** come from git. It comes
from Firestore's native **managed backup schedule**: a server-side daily copy with
retention, provisioned once. This realizes ADR 0005's decision — *"backup por
export periódico do Firestore, não por commit-na-escrita"*.

## Provision it (once)

```sh
scripts/setup-firestore-backup.sh            # project from .firebaserc
# or
scripts/setup-firestore-backup.sh my-project-id
```

The script is idempotent: it creates a **daily** schedule with **7-day** retention
(daily's maximum) only if one isn't already present. It needs the `gcloud` CLI,
authenticated with rights to manage Firestore backups
(`roles/datastore.owner` or `roles/datastore.backupsAdmin`).

The equivalent raw command (e.g. from PowerShell or Cloud Shell):

```sh
gcloud firestore backups schedules create \
  --database="(default)" \
  --recurrence=daily \
  --retention=7d \
  --project=learnings-87db7
```

For a longer window, add a second, weekly schedule (up to 14 weeks retention):

```sh
gcloud firestore backups schedules create \
  --database="(default)" --recurrence=weekly --retention=14w --project=learnings-87db7
```

## Verify

```sh
gcloud firestore backups schedules list --database="(default)" --project=learnings-87db7
gcloud firestore backups list --project=learnings-87db7   # actual backups, once a day has passed
```

## Restore

A backup restores into a **new** database (Firestore never overwrites the live one):

```sh
gcloud firestore databases restore \
  --source-backup=projects/PROJECT/locations/LOCATION/backups/BACKUP_ID \
  --destination-database=restored
```

Inspect `restored`, then point the app at it or copy documents back. Because the
web surface is read-only and reads `(default)`, a restore is a deliberate, manual
recovery step — not part of the write loop.

## Why not export-to-GCS?

`gcloud firestore export` to a bucket is the older pattern and needs its own Cloud
Scheduler job and lifecycle rules. Managed backup schedules are the native, lower-
maintenance equivalent for this single-database project; the export path stays
available if a portable, off-Firestore copy is ever needed.
