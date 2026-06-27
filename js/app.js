/* ============================================================
   우리밭 미생물 도우미 — 공통 스크립트
   모든 페이지가 이 파일을 공유합니다.

   ⚠️ 결과 화면의 데이터는 지금 "임시(가짜)"입니다.
      나중에 친구(백엔드) API가 준비되면, 표시된 fetch 자리에서
      실제 데이터를 받아오도록 바꾸면 됩니다.
   ============================================================ */

/* ------------------------------------------------------------
   0. 사이트 마스코트 — 모든 페이지 좌우 하단에 고정 표시 (PC 화면)
   ------------------------------------------------------------ */
(function renderMascots() {
    function createMascot(src, side) {
        const wrap = document.createElement("div");
        wrap.className = `site-mascot-wrap site-mascot-wrap--${side}`;

        const img = document.createElement("img");
        img.src = src;
        img.alt = "";
        img.className = "site-mascot";

        const caption = document.createElement("span");
        caption.className = "site-mascot__caption";
        caption.textContent = "AI로 생성한 이미지입니다";

        wrap.append(img, caption);
        return wrap;
    }

    document.body.append(
        createMascot("frontend/assets/first_image.png", "left"),
        createMascot("frontend/assets/second_image.png", "right")
    );
})();

/* ------------------------------------------------------------
   1. 홈 화면 — 버튼 → 페이지 이동
   ------------------------------------------------------------ */
function goRecommend() {
    window.location.href = "a_recommend.html";   // a: 추천 입력
}

function goSpray() {
    window.location.href = "b_spray.html";        // b: 살포 입력
}

/* ------------------------------------------------------------
   2. a: 추천 입력 → 저장 후 결과로 이동
   ------------------------------------------------------------ */
function submitRecommend() {
    const sido = document.getElementById("sido").value;
    const sigungu = document.getElementById("sigungu").value;
    const crop = document.getElementById("crop").value;
    const need = document.getElementById("need").value;

    if (!sido || !sigungu) {
        alert("농사 짓는 곳을 시·도부터 골라 주세요!");
        return;
    }

    // 회원가입 없이 → 브라우저에 임시 저장 (다음 페이지로 전달)
    localStorage.setItem("userLocation", sido + " " + sigungu);
    localStorage.setItem("userCrop", crop);
    localStorage.setItem("userNeed", need);

    window.location.href = "a-1_recommend-result.html";   // a-1: 추천 결과
}

/* 시·도를 고르면 → 그에 맞는 시·군·구 목록을 채웁니다 (연동 드롭다운) */
function initRegionSelect() {
    const sidoSel = document.getElementById("sido");
    const sigunguSel = document.getElementById("sigungu");
    if (!sidoSel || !sigunguSel || typeof REGIONS === "undefined") return;

    // 시·도 채우기
    sidoSel.innerHTML = '<option value="">시·도를 고르세요</option>' +
        Object.keys(REGIONS).map(s => `<option value="${s}">${s}</option>`).join("");

    // 시·도 선택 시 시·군·구 채우기
    sidoSel.addEventListener("change", function () {
        const list = REGIONS[this.value] || [];
        sigunguSel.disabled = list.length === 0;
        sigunguSel.innerHTML = list.length
            ? '<option value="">시·군·구를 고르세요</option>' +
              list.map(g => `<option value="${g}">${g}</option>`).join("")
            : '<option value="">먼저 시·도를 고르세요</option>';
    });
}

/* ------------------------------------------------------------
   3. b: 살포 시퀀스 입력은 b_spray.html 의 자체 스크립트가 처리합니다.
      (자재 다중 입력 + 자동완성 + 균종 분기 → localStorage 저장 후 b-1로 이동)
   ------------------------------------------------------------ */

/* ============================================================
   결과 화면 렌더링 (페이지 로드 시 자동 실행)
   ============================================================ */
document.addEventListener("DOMContentLoaded", function () {
    if (document.getElementById("sido")) initRegionSelect();
    if (document.getElementById("recommendResult")) renderRecommendResult();
    if (document.getElementById("sprayResult")) renderSprayResult();
});

/* ------------------------------------------------------------
   한글 라벨 (저장된 코드값 → 농민 언어)
   ------------------------------------------------------------ */
const CROP_LABEL = {
    tomato: "🍅 토마토",
    pepper: "🌶️ 고추",
    cucumber: "🥒 오이",
    lettuce: "🥬 상추",
    wheat: "🌾 밀",
    maize: "🌽 옥수수",
    soybean: "🫘 대두",
    potato: "🥔 감자",
    cabbage: "🥬 배추",
};
const NEED_LABEL = { disease: "병 막기", growth: "잘 자라게 하기" };

/* ------------------------------------------------------------
   a-1: 추천 결과 — /api/recommendMicrobe(RAG+LLM) 호출 결과 표시
   a_recommend.html에서 모아둔 토양·기상 데이터(localStorage)를
   바탕으로 백엔드에 추천을 요청합니다.
   ------------------------------------------------------------ */
const RECOMMEND_BACKEND_BASE_URL = "https://microbe-recommend-website.onrender.com";

async function renderRecommendResult() {
    const crop = localStorage.getItem("userCrop") || "tomato";
    const address = localStorage.getItem("userAddress") || "";
    const envRaw = localStorage.getItem("integratedSoilEnvironment");

    const summary = document.getElementById("summary");
    const resultEl = document.getElementById("recommendResult");

    if (summary) {
        summary.innerHTML =
            `<span class="summary__chip">${CROP_LABEL[crop] || crop}</span>` +
            (address ? `<span class="summary__chip">📍 ${address}</span>` : "");
    }

    if (!envRaw) {
        resultEl.innerHTML = `<p class="notice">먼저 <a href="a_recommend.html">농경지 정보를 입력</a>해주세요.</p>`;
        return;
    }

    const env = JSON.parse(envRaw);
    resultEl.innerHTML = `<p class="notice">🔬 우리 밭 데이터에 맞는 미생물을 분석하는 중입니다...</p>`;

    const params = new URLSearchParams({
        crop,
        soilPh: env.soilPh,
        soilOrganic: env.soilOrganic,
        soilPhosphate: env.soilPhosphate,
        soilPotassium: env.soilPotassium,
        soilCalcium: env.soilCalcium,
        soilMagnesium: env.soilMagnesium,
        soilMoisture: env.soilMoisture,
        airTemp: env.airTemp,
        rain: env.rain,
    });

    try {
        const res = await fetch(`${RECOMMEND_BACKEND_BASE_URL}/api/recommendMicrobe?${params}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "추천 요청 중 오류가 발생했습니다.");

        const cards = data.microbes.map((m) => {
            const v = m.vendorInfo;
            const vendorList = v ? v.vendors.slice(0, 6).map((vendor) => {
                const firstProduct = vendor.products[0];
                return `
                    <li class="vendor-item">
                        <span class="vendor-item__company">${vendor.company}</span>
                        <span class="vendor-item__product">${firstProduct.product}${vendor.products.length > 1 ? ` 외 ${vendor.products.length - 1}개` : ""}</span>
                        ${firstProduct.price ? `<span class="vendor-item__price">${firstProduct.price}</span>` : ""}
                        ${firstProduct.contact ? `<span class="vendor-item__contact">📞 ${firstProduct.contact}</span>` : ""}
                        ${firstProduct.onlineUrl ? `<a class="vendor-item__buy" href="${firstProduct.onlineUrl}" target="_blank" rel="noopener noreferrer">🛒 온라인 구매</a>` : ""}
                    </li>
                `;
            }).join("") : "";

            return `
                <div class="result-card">
                    <span class="result-card__badge">👍 추천 미생물</span>
                    <h2 class="result-card__name">${m.species}</h2>
                    ${v ? `
                        ${v.matchType === "epithet" ? `<p class="result-card__sci">⚠️ "${m.species}"와 표기가 달라 같은 균종으로 보이는 "${v.matchedName}" 판매처를 보여줍니다.</p>` : ""}
                        ${v.matchType === "genus" ? `<p class="result-card__sci">⚠️ "${m.species}"와 정확히 일치하는 제품은 없어, 같은 속(genus)인 "${v.matchedName}" 계열 판매처를 모아 보여줍니다.</p>` : ""}
                        <div class="result-card__row">
                            <span class="label">가격대</span>
                            <span class="value">${v.priceMin !== null ? v.priceMin.toLocaleString() + "원 ~ " + v.priceMax.toLocaleString() + "원" : "정보 없음"}</span>
                        </div>
                        <div class="result-card__row">
                            <span class="label">등록 제품 수</span>
                            <span class="value">${v.productCount}개</span>
                        </div>
                        <div class="result-card__row">
                            <span class="label">농약/비료 등록</span>
                            <span class="value">${v.registered ? "등록됨" : "미등록"}</span>
                        </div>
                        <p class="label" style="margin: 14px 0 8px;">구매 가능 판매처  (${v.vendors.length}곳)</p>
                        <ul class="vendor-list">${vendorList}</ul>
                        ${v.vendors.length > 6 ? `<p class="result-card__sci">외 ${v.vendors.length - 6}곳 더 있음</p>` : ""}
                    ` : `<p class="result-card__effect">판매처 정보가 아직 등록되지 않은 균종입니다.</p>`}
                </div>
            `;
        }).join("");

        // 논문 인용이 들어간 학술적 설명("더보기")과 참고 논문 목록은 기본으로는 숨겨두고,
        // 화면에는 농경지 특성·미생물 효능을 쉬운 말로 풀어준 explanation만 바로 보여줌
        const sourcesList = data.sources.map((s) =>
            `<li>${s.title} <span class="value">(${s.journal}, ${s.year})</span></li>`
        ).join("");

        // 추천된 첫 균종을 살포 시퀀스로 넘기기 위한 학명 (균종 자동판정용)
        const topSpecies = (data.microbes && data.microbes[0] && data.microbes[0].species) || "";

        resultEl.innerHTML = `
            ${cards}
            <p class="result-card__effect">${data.explanation}</p>
            ${data.quotaExceeded ? `<p class="notice">⚠️ AI 무료 사용량 한도에 도달해 추천 균종 목록은 비어 있습니다. 잠시 후 다시 시도해주세요.</p>` : ""}
            ${data.scientificEvidence ? `
                <details class="notice">
                    <summary>📄 더보기: 논문 근거로 살펴보기</summary>
                    <p style="margin-top: 10px;">${data.scientificEvidence}</p>
                    <p class="label" style="margin: 14px 0 8px;">참고 논문 ${data.sources.length}건</p>
                    <ul>${sourcesList}</ul>
                </details>
            ` : ""}
            ${topSpecies ? `
                <button type="button" id="goSprayBtn" class="btn btn--primary" style="margin-top:18px;"
                        data-species="${topSpecies}">
                    🗓️ 이 미생물 언제 뿌릴지 확인하기 →
                </button>` : ""}
        `;

        // 버튼: 추천 학명을 저장하고 살포 시퀀스로 이동 → b_spray가 균종을 자동판정
        const goSprayBtn = document.getElementById("goSprayBtn");
        if (goSprayBtn) {
            goSprayBtn.addEventListener("click", () => {
                localStorage.setItem("inoculantSpecies", goSprayBtn.dataset.species);
                window.location.href = "b_spray.html";
            });
        }
    } catch (error) {
        console.error(error);
        resultEl.innerHTML = `<p class="notice">⚠️ ${error.message}</p>`;
    }
}

/* ------------------------------------------------------------
   b-1: 살포 시퀀스 결과 — /api/spraySequence(엔진) 호출 결과 표시
   b_spray.html에서 저장한 자재 목록·균종·예정일을 백엔드로 보내
   "미생물제를 며칠 뒤 뿌려야 안전한지"를 계산해 신호등으로 보여줌.
   ------------------------------------------------------------ */
const INOC_TYPE_KO = { bacteria: "세균제", fungus: "곰팡이제", both: "균종 미상(보수적)" };

function fmtKoreanDate(isoStr) {
    if (!isoStr) return "";
    const [y, m, d] = isoStr.split("-").map(Number);
    return `${m}월 ${d}일`;
}

async function renderSprayResult() {
    const resultEl = document.getElementById("sprayResult");
    const summaryEl = document.getElementById("summary");

    let materials;
    try {
        materials = JSON.parse(localStorage.getItem("spraySeqMaterials") || "[]");
    } catch (e) { materials = []; }

    if (!materials.length) {
        resultEl.innerHTML = `<p class="notice">먼저 <a href="b_spray.html">최근에 친 자재를 입력</a>해주세요.</p>`;
        return;
    }

    const inoculantType = localStorage.getItem("spraySeqInoculantType") || "both";
    const inoculantSpecies = localStorage.getItem("spraySeqInoculantSpecies") || "";
    const inoculantDate = localStorage.getItem("spraySeqInoculantDate") || "";
    let loc = {};
    try { loc = JSON.parse(localStorage.getItem("spraySeqLocation") || "{}"); } catch (e) { loc = {}; }

    // 입력 요약 칩
    if (summaryEl) {
        summaryEl.innerHTML =
            `<span class="summary__chip">미생물: ${inoculantSpecies || INOC_TYPE_KO[inoculantType]}</span>` +
            `<span class="summary__chip">친 자재 ${materials.length}건</span>`;
    }

    resultEl.innerHTML = `<p class="notice">🧮 안전한 살포 시점을 계산하는 중입니다...</p>`;

    try {
        const res = await fetch(`${RECOMMEND_BACKEND_BASE_URL}/api/spraySequence`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                materials: materials.map(m => ({ kind: m.kind, name: m.name, appliedDate: m.appliedDate })),
                inoculantType,
                inoculantSpecies: inoculantSpecies || undefined,
                inoculantDate: inoculantDate || undefined,
                lat: loc.lat || undefined,
                lng: loc.lng || undefined,
                obsrSpotCd: loc.obsrSpotCd || undefined,
            }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "살포 시퀀스 계산 중 오류가 발생했습니다.");

        // 신호등 색: 권장일까지 남은 일수로 판정 (예정일 없으면 오늘 기준)
        const baseDate = inoculantDate ? new Date(inoculantDate) : new Date();
        baseDate.setHours(0, 0, 0, 0);
        const safe = new Date(data.safeDate);
        const daysLeft = Math.round((safe - baseDate) / 86400000);

        let cls, emoji, headline;
        if (data.verdict === "safe" || daysLeft <= 0) {
            cls = "signal--go"; emoji = "🟢";
            headline = "지금 뿌려도 괜찮아요";
        } else if (daysLeft <= 3) {
            cls = "signal--warn"; emoji = "🟡";
            headline = "조금만 더 기다리세요";
        } else {
            cls = "signal--stop"; emoji = "⛔";
            headline = "아직 이릅니다";
        }

        const g = data.governingMaterial || {};
        const safeText = fmtKoreanDate(data.safeDate);

        // 자재별 내역 표
        const perRows = (data.perMaterial || []).map(p => `
            <div class="result-card__row">
                <span class="label">${p.risk} ${p.name}${p.family ? ` <span class="value">(${p.family})</span>` : ""}</span>
                <span class="value">${p.appliedDate} → ${fmtKoreanDate(p.clearDate)} 해제 (${p.term}일)</span>
            </div>`).join("");

        resultEl.innerHTML = `
            <div class="signal ${cls}">
                <div class="signal__light">${emoji}</div>
                <h2 class="signal__headline">${headline}</h2>
                <p class="signal__date">📅 ${safeText} 이후 살포 권장</p>
                <p class="signal__sub">${data.headline}</p>
            </div>

            <div class="result-card">
                <span class="result-card__badge">⏳ 가장 오래 기다려야 하는 자재</span>
                <h2 class="result-card__name">${g.risk || ""} ${g.name || "-"}</h2>
                ${g.family ? `<p class="result-card__sci">${g.family} · ${g.appliedDate} 살포 → ${g.term}일 후 해제</p>` : ""}
            </div>

            <div class="result-card">
                <p class="label" style="margin-bottom:8px;">자재별 안전 해제일 (미생물: ${INOC_TYPE_KO[data.inoculantType] || INOC_TYPE_KO[inoculantType]} 기준)</p>
                ${perRows}
            </div>

            ${data.tempAdvisory ? `<p class="notice">🌡️ ${data.tempAdvisory}</p>` : ""}

            ${data.copperWarning && data.copperWarning.flag ? `
                <div class="result-card" style="border:2px solid #d64545; background:#fff5f5;">
                    <span class="result-card__badge" style="background:#d64545;">⚠️ 구리·황 누적 경고</span>
                    <p class="result-card__effect">${data.copperWarning.message}</p>
                </div>` : ""}

            ${data.unmatchedMaterials && data.unmatchedMaterials.length ? `
                <p class="notice">❓ 위험표에서 확인하지 못한 자재가 있어 <b>보수적으로(🟡)</b> 계산했습니다:
                ${data.unmatchedMaterials.join(", ")}. 이름을 다시 확인하거나 종류 버튼으로 골라보세요.</p>` : ""}

            <p class="notice">${data.note || ""} 표시된 간격은 단정값이 아니라 <b>최소 권장값</b>이며, 길수록 안전합니다.</p>
        `;
    } catch (error) {
        console.error(error);
        resultEl.innerHTML = `<p class="notice">⚠️ ${error.message}</p>`;
    }
}
