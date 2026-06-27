import { useEffect, useState } from "react";
import { X, LogIn } from "lucide-react";
import { authReady, signIn, signUp, normalizeUser } from "./records.js";

/* ──────────────────────────────────────────────────────────────
   로그인 / 회원가입 모달 (Supabase Auth)
   - 비밀번호 해시·세션 유지·토큰 갱신은 Supabase가 처리.
   - Supabase 미설정(authReady=false)이면 안내만 표시.
   - 로그인은 선택: 모달을 닫으면 추천/살포는 그대로 사용 가능.
────────────────────────────────────────────────────────────── */
export default function LoginModal({ onClose, onLogin }) {
  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function switchMode(next) {
    setMode(next);
    setError("");
    setInfo("");
  }

  async function handleSubmit() {
    setError("");
    setInfo("");
    const id = email.trim();
    if (!id || !password) {
      setError("이메일과 비밀번호를 입력해주세요.");
      return;
    }
    if (mode === "signup" && password.length < 6) {
      setError("비밀번호는 6자 이상으로 만들어주세요.");
      return;
    }
    if (!authReady()) {
      setError("로그인 기능이 아직 설정되지 않았습니다. (관리자 설정 필요)");
      return;
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        const data = await signUp(id, password);
        if (data.session) {
          onLogin(normalizeUser(data.user)); // 즉시 로그인됨
        } else {
          // 이메일 인증이 켜진 프로젝트 — 확인 메일 안내
          setInfo("확인 메일을 보냈어요. 메일의 링크로 인증한 뒤 로그인해주세요.");
          setMode("login");
        }
      } else {
        const data = await signIn(id, password);
        onLogin(normalizeUser(data.user));
      }
    } catch (e) {
      setError(authErrorToKorean(e, mode));
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter") handleSubmit();
  }

  const isSignup = mode === "signup";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-700 text-white">
              <LogIn className="h-4 w-4" />
            </span>
            <h3 className="text-lg font-bold text-emerald-800">{isSignup ? "회원가입" : "로그인"}</h3>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600" aria-label="닫기">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 탭 */}
        <div className="mb-4 grid grid-cols-2 rounded-lg bg-stone-100 p-1 text-sm font-semibold">
          <button
            onClick={() => switchMode("login")}
            className={`rounded-md py-1.5 transition-colors ${!isSignup ? "bg-white text-emerald-800 shadow-sm" : "text-stone-500"}`}
          >
            로그인
          </button>
          <button
            onClick={() => switchMode("signup")}
            className={`rounded-md py-1.5 transition-colors ${isSignup ? "bg-white text-emerald-800 shadow-sm" : "text-stone-500"}`}
          >
            회원가입
          </button>
        </div>

        <p className="mb-4 text-xs leading-relaxed text-stone-500">
          TOBio에 로그인하면 추천·살포 결과를 내 기록에 저장해 다시 볼 수 있어요.
        </p>

        <label className="mb-1 block text-sm font-semibold text-stone-700">이메일</label>
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(""); }}
          onKeyDown={onKeyDown}
          placeholder="example@tobio.kr"
          autoComplete="email"
          className="mb-3 w-full rounded-md border border-stone-300 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-600"
        />

        <label className="mb-1 block text-sm font-semibold text-stone-700">비밀번호</label>
        <input
          type="password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(""); }}
          onKeyDown={onKeyDown}
          placeholder={isSignup ? "6자 이상" : "••••••••"}
          autoComplete={isSignup ? "new-password" : "current-password"}
          className="mb-2 w-full rounded-md border border-stone-300 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-600"
        />

        {error && <p className="mb-2 text-xs font-semibold text-rose-600">{error}</p>}
        {info && <p className="mb-2 text-xs font-semibold text-emerald-700">{info}</p>}

        <button
          onClick={handleSubmit}
          disabled={busy}
          className="mt-2 w-full rounded-md bg-emerald-700 py-3 font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60"
        >
          {busy ? "처리 중…" : isSignup ? "회원가입" : "로그인"}
        </button>

        <p className="mt-3 text-center text-[11px] leading-relaxed text-stone-400">
          {isSignup
            ? "이미 계정이 있으면 위의 ‘로그인’ 탭을 눌러주세요."
            : "계정이 없으면 위의 ‘회원가입’ 탭에서 만들 수 있어요."}
        </p>
      </div>
    </div>
  );
}

// Supabase 인증 에러를 농민이 이해할 한국어로
function authErrorToKorean(e, mode) {
  const m = (e?.message || "").toLowerCase();
  if (m.includes("invalid login")) return "이메일 또는 비밀번호를 확인해주세요.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "이미 가입된 이메일입니다. ‘로그인’ 탭을 이용해주세요.";
  if (m.includes("email") && m.includes("confirm")) return "이메일 인증이 필요합니다. 메일을 확인해주세요.";
  if (m.includes("password")) return "비밀번호 조건을 확인해주세요(6자 이상).";
  if (m.includes("rate limit")) return "요청이 많습니다. 잠시 후 다시 시도해주세요.";
  return (mode === "signup" ? "회원가입" : "로그인") + " 중 오류가 발생했습니다: " + (e?.message || "알 수 없음");
}
