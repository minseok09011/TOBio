/* ============================================================
   Supabase 클라이언트 (프론트)
   ------------------------------------------------------------
   - VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY 로만 설정.
   - 값이 비면 supabase=null → 로그인/기록만 비활성화되고
     추천·살포 핵심 기능은 그대로 동작(로그인은 선택).
   ⚠️ publishable(anon) 키만 사용. service_role 키 금지.
   ============================================================ */
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabaseEnabled = Boolean(url && key);

export const supabase = supabaseEnabled
  ? createClient(url, key, {
      auth: {
        persistSession: true, // 새로고침/재방문에도 세션 유지(localStorage)
        autoRefreshToken: true,
      },
    })
  : null;

if (!supabaseEnabled) {
  console.warn(
    "[TOBio] Supabase 환경변수(VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY)가 없어 로그인·기록 기능이 비활성화됩니다."
  );
}
