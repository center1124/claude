import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** 서버 주소가 설정되지 않았으면 체험판(이 기기에만 저장)으로 동작한다 */
export const serverEnabled = Boolean(url && key);

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!url || !key) throw new Error("Supabase 주소가 설정되지 않았습니다");
  client ??= createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
  return client;
}
