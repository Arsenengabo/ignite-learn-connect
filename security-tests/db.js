// Builds an in-memory copy of the Codex database from supabase/migrations,
// with small stand-ins for the parts Supabase provides (auth, storage, roles).
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MIGRATIONS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../supabase/migrations");

// Older migrations that no longer replay on an empty database (see audit finding H4).
// Their changes were superseded by later migrations; they are skipped, not hidden: the
// test prints them so the list can shrink once the history is cleaned up.
const SUPABASE_STANDINS = `
  CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
  CREATE SCHEMA auth; CREATE SCHEMA storage; CREATE SCHEMA extensions;
  CREATE TABLE auth.users (id uuid primary key default gen_random_uuid(), email text,
    raw_user_meta_data jsonb default '{}', raw_app_meta_data jsonb default '{}', created_at timestamptz default now());
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ select current_user::text $$;
  CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ select '{}'::jsonb $$;
  CREATE TABLE storage.buckets (id text primary key, name text, public boolean default false,
    file_size_limit bigint, allowed_mime_types text[], created_at timestamptz default now());
  CREATE TABLE storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text,
    owner uuid, metadata jsonb, created_at timestamptz default now());
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql AS $$ select string_to_array(name, '/') $$;
  GRANT USAGE ON SCHEMA public, auth, storage TO anon, authenticated, service_role;
  CREATE PUBLICATION supabase_realtime;
`;

export async function buildDatabase({ excludeMigrations = [] } = {}) {
  const db = new PGlite();
  await db.exec(SUPABASE_STANDINS);
  const skipped = [];
  const files = fs.readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    if (excludeMigrations.some((prefix) => file.startsWith(prefix))) continue;
    let sql = fs.readFileSync(path.join(MIGRATIONS, file), "utf8");
    // Some old migrations create the same policy twice; tolerate that during replay.
    sql = sql.replace(/CREATE POLICY\s+("[^"]+")\s+ON\s+([\w.]+)/gi, "DROP POLICY IF EXISTS $1 ON $2; CREATE POLICY $1 ON $2");
    if (/^20260825062532/.test(file)) {
      // This migration seeds chat channels owned by the first user.
      await db.exec(`insert into auth.users(id, email) values ('00000000-0000-0000-0000-0000000000aa', 'seed@example.com') on conflict do nothing`);
    }
    try {
      await db.exec(`BEGIN; ${sql}; COMMIT;`);
    } catch (error) {
      await db.exec("ROLLBACK").catch(() => {});
      skipped.push(`${file}: ${error.message}`);
    }
  }
  // Pieces of the skipped 2025-09-01 migrations that the live database has and later code relies on.
  await db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS test_quiz_responses_session_question ON public.quiz_responses (session_id, question_id);`);

  // Supabase grants table access to these roles by default; access is then limited by RLS.
  await db.exec(`
    GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
    GRANT ALL ON ALL TABLES IN SCHEMA storage TO authenticated;
    -- Functions: Postgres lets everyone execute new functions unless a migration revokes it, as on Supabase.
  `);
  return { db, skipped };
}

/** Creates a user the way Supabase signup does (fires the handle_new_user trigger). */
export async function signUp(db, id, role) {
  await db.exec(
    `insert into auth.users(id, email, raw_user_meta_data) values ('${id}', '${id.slice(0, 8)}@example.com', '{"role":"${role}","full_name":"${role} ${id.slice(0, 4)}"}')`,
  );
}

/**
 * Runs SQL as a signed-in browser user (role "authenticated", auth.uid() = userId).
 * Returns { rows } on success or { error } when the database refuses.
 */
export async function asUser(db, userId, sql) {
  await db.exec(`BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub', '${userId}', true);`);
  try {
    const result = await db.query(sql);
    await db.exec("COMMIT");
    return { rows: result.rows };
  } catch (error) {
    await db.exec("ROLLBACK");
    return { error: error.message };
  }
}

/** Runs SQL as the database owner, for test setup. */
export async function asOwner(db, sql) {
  return (await db.query(sql)).rows;
}
