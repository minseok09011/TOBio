import { useEffect, useState } from "react";
import MicrobeAiLandingPage from "./LandingPage.jsx";
import { CropSelect, AddressInput, LoadingScreen, ResultScreen, CheckScreen } from "./AppFlow.jsx";
import { CROPS } from "./data.js";
import LoginModal from "./LoginModal.jsx";
import RecordsScreen from "./RecordsScreen.jsx";
import { onAuthChange, signOut } from "./records.js";

export default function App() {
  const [view, setView] = useState("landing"); // landing | crop | address | loading | result | check | records
  const [crop, setCrop] = useState(null);
  const [address, setAddress] = useState(null);
  const [result, setResult] = useState(null);
  const [checkPrefill, setCheckPrefill] = useState({ microbe: "", crop: "" });

  // 실제 인증 상태 (Supabase 세션). 새로고침/재방문에도 유지되며, 미설정 시 null.
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => onAuthChange(setUser), []);

  function handleLogin(u) {
    setUser(u);            // onAuthChange 리스너도 곧 갱신하지만 즉시 반영
    setShowLogin(false);
  }
  async function handleLogout() {
    await signOut();       // 리스너가 user를 null로 갱신
  }

  function goHome() {
    setView("landing");
    window.scrollTo(0, 0);
  }

  function startRecommend() {
    setCrop(null);
    setAddress(null);
    setView("crop");
  }

  function startCheck() {
    setCheckPrefill({ microbe: "", crop: "" });
    setView("check");
  }

  function startMyRecords() {
    setView("records");
    window.scrollTo(0, 0);
  }

  function goToCheckFromResult() {
    const microbes = result?.microbes || result?.recommendations || (Array.isArray(result) ? result : result ? [result] : []);
    const top = microbes?.[0];
    const microbeName = top?.name || top?.korName || top?.korean_name || top?.species || "";
    const cropName = CROPS.find((c) => c.id === crop)?.name || crop || "";
    setCheckPrefill({ microbe: microbeName, crop: cropName });
    setView("check");
  }

  function handleLoadingDone(apiResult) {
    setResult(apiResult);
    setView("result");
  }

  function renderView() {
    switch (view) {
      case "crop":
        return <CropSelect crop={crop} onSelect={setCrop} onBack={goHome} onNext={() => setView("address")} />;
      case "address":
        return (
          <AddressInput
            address={address}
            onSelect={setAddress}
            onBack={() => setView("crop")}
            onNext={() => setView("loading")}
          />
        );
      case "loading":
        return <LoadingScreen crop={crop} address={address} onDone={handleLoadingDone} />;
      case "result":
        return (
          <ResultScreen result={result} crop={crop} address={address} onCheck={goToCheckFromResult} onHome={goHome} />
        );
      case "check":
        return <CheckScreen prefill={checkPrefill} onBack={goHome} />;
      case "records":
        return <RecordsScreen onBack={goHome} />;
      default:
        return (
          <MicrobeAiLandingPage
            onStartRecommend={startRecommend}
            onStartCheck={startCheck}
            user={user}
            onLoginClick={() => setShowLogin(true)}
            onLogout={handleLogout}
            onMyRecords={startMyRecords}
          />
        );
    }
  }

  return (
    <>
      {renderView()}
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} onLogin={handleLogin} />}
    </>
  );
}
