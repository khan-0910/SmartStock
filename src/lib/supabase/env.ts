// Public Supabase settings. Referenced directly so Next can inline them.
export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill them in.",
    );
  }
  return { url, anonKey };
}

/** False while .env.local still holds the example/placeholder values. */
export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return !!url && !/placeholder|your-project-ref/.test(url) && !/placeholder|your-anon/.test(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "");
}
