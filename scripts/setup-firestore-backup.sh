#!/usr/bin/env bash
# Configure the periodic Firestore backup (issue #27, ADR 0005).
#
# Firestore is the single source of truth since the cutover — the `.mdx` files
# stay in git only as the pre-migration snapshot, and the write loop (MCP) never
# commits. Recovery therefore comes from Firestore's own *managed backup
# schedule*: a native, server-side daily copy with retention, provisioned once by
# this script. No GCS bucket, no Cloud Scheduler, no commit-on-write (which would
# re-entangle the git loop ADR 0005 removed).
#
# Idempotent: it checks for an existing daily schedule on the database and only
# creates one if none is present, so re-running is safe.
#
# Usage:
#   scripts/setup-firestore-backup.sh [PROJECT_ID]
# PROJECT_ID defaults to $GOOGLE_CLOUD_PROJECT, else the `default` project in
# .firebaserc. Requires the gcloud CLI, authenticated with rights to manage
# Firestore backups (roles/datastore.owner or roles/datastore.backupsAdmin).
set -euo pipefail

DATABASE="(default)"
# Daily is the finest managed recurrence; 7 days is its maximum retention. For a
# longer window, add a second schedule with `--recurrence=weekly --retention=14w`.
RECURRENCE="daily"
RETENTION="7d"

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

resolve_project() {
  if [[ -n "${1:-}" ]]; then echo "$1"; return; fi
  if [[ -n "${GOOGLE_CLOUD_PROJECT:-}" ]]; then echo "$GOOGLE_CLOUD_PROJECT"; return; fi
  # Pull the "default" project out of .firebaserc without depending on jq.
  sed -n 's/.*"default"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' \
    "$repo_root/.firebaserc" | head -n1
}

PROJECT="$(resolve_project "${1:-}")"
if [[ -z "$PROJECT" ]]; then
  echo "error: could not resolve a project id (pass one, set GOOGLE_CLOUD_PROJECT, or add it to .firebaserc)" >&2
  exit 1
fi

echo "Project:  $PROJECT"
echo "Database: $DATABASE"
echo "Schedule: $RECURRENCE, retention $RETENTION"

# A schedule's recurrence is a oneof rendered as a `dailyRecurrence` /
# `weeklyRecurrence` key (not a `recurrence.name` field), so key the idempotency
# check on that JSON key: present iff a schedule of this kind already exists.
existing="$(gcloud firestore backups schedules list \
  --database="$DATABASE" --project="$PROJECT" \
  --format=json 2>/dev/null || true)"

if echo "$existing" | grep -q "\"${RECURRENCE}Recurrence\""; then
  echo "A $RECURRENCE backup schedule already exists — nothing to do."
  exit 0
fi

gcloud firestore backups schedules create \
  --database="$DATABASE" \
  --recurrence="$RECURRENCE" \
  --retention="$RETENTION" \
  --project="$PROJECT"

echo "Created a $RECURRENCE Firestore backup schedule (retention $RETENTION)."
echo "Verify with: gcloud firestore backups schedules list --database='$DATABASE' --project='$PROJECT'"
