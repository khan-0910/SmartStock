import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

// Runs the real migrations in an in-process Postgres (PGlite) with a minimal
// stand-in for the Supabase auth schema and roles, so RLS and the stock
// function are exercised as a normal `authenticated` user.

const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  -- Mimic Supabase's default grants so the migration's revokes are tested.
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
`;

export async function createDb() {
  const db = new PGlite();
  await db.exec(SUPABASE_STUB);
  const dir = join(__dirname, "..", "..", "supabase", "migrations");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(dir, file), "utf8"));
  }
  return db;
}

export type Db = Awaited<ReturnType<typeof createDb>>;

export async function createUser(db: Db, id: string) {
  await db.query("insert into auth.users (id, email) values ($1, $2)", [id, `${id.slice(0, 4)}@example.test`]);
}

/** Run `fn` as an authenticated user (or anon when userId is null), then reset. */
export async function as<T>(db: Db, userId: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set role ${userId ? "authenticated" : "anon"}`);
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId ?? ""]);
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
  }
}
