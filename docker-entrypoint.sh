#!/bin/sh
set -e

# Run the app as the user who owns the data folder, so everything it writes in data/ belongs
# to that user on the host. PUID/PGID (written to .env by setup.sh) take precedence; otherwise
# the owner of the database folder is used, falling back to 1000 if Docker created it as root.
# WRITABLE_DIRS lists extra directories the app must be able to write to (used in development).
if [ "$(id -u)" = "0" ]; then
  db_dir="$(dirname "${DATABASE_PATH:-/app/data/db/onearctic.db}")"
  files_dir="${FILES_PATH:-/app/data/files}"
  mkdir -p "$db_dir" "$files_dir"

  uid="${PUID:-$(stat -c %u "$db_dir")}"
  gid="${PGID:-$(stat -c %g "$db_dir")}"
  [ "$uid" = "0" ] && uid=1000
  [ "$gid" = "0" ] && gid=1000

  for dir in "$db_dir" "$files_dir" ${WRITABLE_DIRS:-}; do
    mkdir -p "$dir"
    find "$dir" \( ! -user "$uid" -o ! -group "$gid" \) -exec chown "$uid:$gid" {} +
  done

  exec setpriv --reuid="$uid" --regid="$gid" --clear-groups "$@"
fi

exec "$@"
