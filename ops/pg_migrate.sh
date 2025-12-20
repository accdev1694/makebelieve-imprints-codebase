#!/usr/bin/env bash
# Usage: ./pg_migrate.sh src_host src_user src_db dest_host dest_user dest_db
set -euo pipefail
SRC_HOST="$1"
SRC_USER="$2"
SRC_DB="$3"
DEST_HOST="$4"
DEST_USER="$5"
DEST_DB="$6"

TMP_DUMP="/tmp/mkbl_$(date +%Y%m%d%H%M).dump"

echo "Dumping source DB..."
pg_dump -h "$SRC_HOST" -U "$SRC_USER" -Fc -d "$SRC_DB" -f "$TMP_DUMP"

echo "Copying dump to destination host..."
scp "$TMP_DUMP" "$DEST_USER@$DEST_HOST:/tmp/"

echo "Restoring on destination..."
ssh "$DEST_USER@$DEST_HOST" "pg_restore -h localhost -U $DEST_USER -d $DEST_DB -v /tmp/$(basename $TMP_DUMP)"

echo "Migration complete."
