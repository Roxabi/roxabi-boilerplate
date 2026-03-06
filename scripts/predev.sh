#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Load .env from repo root
if [ -f "$ROOT_DIR/.env" ]; then
  set -a; source "$ROOT_DIR/.env"; set +a
fi

DATABASE_URL="${DATABASE_URL:-}"
if [ -z "$DATABASE_URL" ]; then
  exit 0
fi

# ── Docker / Postgres health check ──────────────────────────────────────────
_pg_server_ready() {
  (cd "$ROOT_DIR" && docker compose exec -T postgres pg_isready -q 2>/dev/null)
}

_pg_auth_ready() {
  cd "$ROOT_DIR/apps/api" && bun -e "
    import postgres from 'postgres';
    const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 3 });
    try { await sql\`SELECT 1\`; await sql.end(); process.exit(0); }
    catch { try { await sql.end(); } catch {} process.exit(1); }
  " 2>/dev/null
}

if ! _pg_auth_ready; then
  echo ""
  echo "⚠  Postgres is not reachable. Starting Docker services..."
  (cd "$ROOT_DIR" && docker compose up -d)

  echo -n "   Waiting for Postgres"
  for i in $(seq 1 60); do
    sleep 1
    # Phase 1: server accepts connections
    if ! _pg_server_ready; then echo -n "."; continue; fi
    # Phase 2: DATABASE_URL credentials work (user/db may still be initializing)
    if _pg_auth_ready; then echo " ✓"; break; fi
    echo -n "."
    if [ "$i" -eq 60 ]; then
      echo ""
      echo "✗  Postgres did not become ready in time."
      echo "   Hint: ensure APP_SLUG or POSTGRES_USER in .env matches DATABASE_URL."
      echo "   Check: docker compose logs postgres"
      exit 1
    fi
  done
fi

JOURNAL="$ROOT_DIR/apps/api/drizzle/migrations/meta/_journal.json"
if [ ! -f "$JOURNAL" ]; then
  exit 0
fi

# Count expected migrations from journal (pure grep, no bun needed)
EXPECTED=$(grep -c '"tag"' "$JOURNAL" || echo "0")
EXPECTED=$((EXPECTED + 0))

if [ "$EXPECTED" -eq 0 ]; then
  exit 0
fi

# Count applied migrations from DB (needs postgres package from apps/api)
# tr -dc strips any non-digit chars from bun output (ANSI codes, CR, etc.)
APPLIED=$(cd "$ROOT_DIR/apps/api" && bun -e "
  import postgres from 'postgres';
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  try {
    const rows = await sql\`SELECT count(*)::int AS count FROM drizzle.__drizzle_migrations\`;
    console.log(rows[0]?.count ?? 0);
  } catch {
    console.log(0);
  } finally {
    await sql.end();
  }
" 2>/dev/null | tr -dc '0-9' || echo "0")
APPLIED=${APPLIED:-0}

PENDING=$((EXPECTED - APPLIED))
if [ "$PENDING" -le 0 ]; then
  exit 0
fi

echo ""
echo "⚠  $PENDING pending database migration(s) detected."
read -r -p "   Run migrations now? [Y/n] " REPLY
echo ""

REPLY="${REPLY:-Y}"
if [[ "$REPLY" =~ ^[Yy]$ ]] || [ -z "$REPLY" ]; then
  bash "$ROOT_DIR/scripts/db.sh" migrate
fi
