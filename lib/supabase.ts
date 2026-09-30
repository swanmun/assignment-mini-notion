import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Created lazily so prerendering without env vars doesn't crash at import time.
let client: SupabaseClient | null = null;

export function supabase() {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 가 .env.local 에 없습니다.");
    client = createClient(url, key);
  }
  return client;
}
