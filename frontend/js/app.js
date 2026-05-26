/* ============================================================
   우리밭 미생물 도우미 — 공통 스크립트
   모든 페이지가 이 파일을 공유합니다.

   ⚠️ 결과 화면의 데이터는 지금 "임시(가짜)"입니다.
      나중에 친구(백엔드) API가 준비되면, 표시된 fetch 자리에서
      실제 데이터를 받아오도록 바꾸면 됩니다.
   ============================================================ */

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
   3. b: 살포 입력 → 저장 후 결과로 이동
   ------------------------------------------------------------ */
function submitSpray() {
    const last = document.getElementById("sprayLast").value;
    const lastDate = document.getElementById("sprayLastDate").value;
    const next = document.getElementById("sprayNext").value;

    if (!lastDate) {
        alert("언제 뿌렸는지 날짜를 골라 주세요!");
        return;
    }

    localStorage.setItem("sprayLast", last);
    localStorage.setItem("sprayLastDate", lastDate);
    localStorage.setItem("sprayNext", next);

    window.location.href = "b-1_spray-result.html";        // b-1: 살포 결과
}

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
const CROP_LABEL = { tomato: "🍅 토마토", pepper: "🌶️ 고추", cucumber: "🥒 오이" };
const NEED_LABEL = { disease: "병 막기", growth: "잘 자라게 하기" };
const SPRAY_LABEL = {
    chemical: "농약",
    microbe: "미생물 약제",
    nutrient: "영양제(비료)",
    none: "아무것도 안 뿌림"
};

/* ------------------------------------------------------------
   a-1: 추천 결과 — 임시 데이터로 미생물 카드 표시
   ※ 실제로는 백엔드가 토양·작물에 맞춰 계산해 줍니다.
      예) fetch(`/api/recommend?crop=${crop}&need=${need}&loc=${loc}`)
   ------------------------------------------------------------ */
function renderRecommendResult() {
    const crop = localStorage.getItem("userCrop") || "tomato";
    const need = localStorage.getItem("userNeed") || "disease";
    const loc = localStorage.getItem("userLocation") || "";

    // ── 임시(가짜) 추천 데이터 — 나중에 API 응답으로 교체 ──
    const FAKE_DB = {
        disease: {
            name: "바실러스 미생물",
            sci: "Bacillus subtilis",
            effect: "잎과 뿌리에 생기는 나쁜 곰팡이를 막아, 탄저병·잿빛곰팡이 같은 병을 줄여 줍니다.",
            price: "1만 5천원 ~ 2만원 (1L)",
            product: "○○바이오 강력방제"
        },
        growth: {
            name: "트리코더마 미생물",
            sci: "Trichoderma harzianum",
            effect: "뿌리를 잘 내리게 하고 흙을 부드럽게 만들어, 작물이 튼튼하게 자라도록 도와줍니다.",
            price: "1만 2천원 ~ 1만 8천원 (1L)",
            product: "△△그린 뿌리튼튼"
        }
    };
    const rec = FAKE_DB[need] || FAKE_DB.disease;

    // 요약 칩
    const summary = document.getElementById("summary");
    if (summary) {
        summary.innerHTML =
            `<span class="summary__chip">${CROP_LABEL[crop] || crop}</span>` +
            `<span class="summary__chip">${NEED_LABEL[need] || need}</span>` +
            (loc ? `<span class="summary__chip">📍 ${loc}</span>` : "");
    }

    // 미생물 카드
    document.getElementById("recommendResult").innerHTML = `
        <div class="result-card">
            <span class="result-card__badge">👍 가장 추천해요</span>
            <h2 class="result-card__name">${rec.name}</h2>
            <p class="result-card__sci">${rec.sci}</p>
            <p class="result-card__effect">${rec.effect}</p>
            <div class="result-card__row">
                <span class="label">가격대</span>
                <span class="value">${rec.price}</span>
            </div>
            <div class="result-card__row">
                <span class="label">추천 제품</span>
                <span class="value">${rec.product}</span>
            </div>
        </div>
        <p class="notice">
            ※ 지금 보이는 내용은 <b>예시</b>예요. 곧 우리 밭 흙과 날씨에 맞춘
            진짜 추천으로 바뀝니다.
        </p>
    `;
}

/* ------------------------------------------------------------
   b-1: 살포 결과 — 임시 규칙으로 신호등 표시
   ※ 실제로는 백엔드가 날씨·약제 간격을 보고 판단해 줍니다.
   ------------------------------------------------------------ */
function renderSprayResult() {
    const last = localStorage.getItem("sprayLast") || "none";
    const lastDateStr = localStorage.getItem("sprayLastDate");
    const next = localStorage.getItem("sprayNext") || "microbe";

    // ── 임시 규칙: 마지막 살포일 + 7일 후부터 가능 ──
    //    (실제 간격/날씨 판단은 백엔드가 계산)
    const WAIT_DAYS = 7;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastDate = lastDateStr ? new Date(lastDateStr) : today;
    const canDate = new Date(lastDate);
    canDate.setDate(canDate.getDate() + WAIT_DAYS);

    const dayMs = 1000 * 60 * 60 * 24;
    const daysLeft = Math.ceil((canDate - today) / dayMs);

    // 신호등 판정
    let cls, emoji, headline, dateLine;
    const canDateText = `${canDate.getMonth() + 1}월 ${canDate.getDate()}일`;

    if (daysLeft <= 0) {
        cls = "signal--go"; emoji = "🟢";
        headline = "오늘 뿌려도 괜찮아요";
        dateLine = "지금 살포할 수 있어요";
    } else if (daysLeft <= 2) {
        cls = "signal--warn"; emoji = "🟡";
        headline = "조금만 기다리세요";
        dateLine = `${canDateText}부터 뿌릴 수 있어요`;
    } else {
        cls = "signal--stop"; emoji = "⛔";
        headline = "아직 뿌리면 안 돼요";
        dateLine = `${canDateText}부터 뿌릴 수 있어요`;
    }

    // 요약 칩
    const summary = document.getElementById("summary");
    if (summary) {
        summary.innerHTML =
            `<span class="summary__chip">최근: ${SPRAY_LABEL[last] || last}</span>` +
            `<span class="summary__chip">뿌릴 것: ${SPRAY_LABEL[next] || next}</span>`;
    }

    document.getElementById("sprayResult").innerHTML = `
        <div class="signal ${cls}">
            <div class="signal__light">${emoji}</div>
            <h2 class="signal__headline">${headline}</h2>
            <p class="signal__date">📅 ${dateLine}</p>
            <p class="signal__sub">
                마지막으로 ${SPRAY_LABEL[last] || last}을(를) 뿌린 뒤
                약 ${WAIT_DAYS}일 정도 간격을 두는 게 좋아요.
            </p>
        </div>
        <p class="notice">
            ※ 지금은 <b>예시</b>예요. 곧 우리 동네 날씨(비·바람)까지 보고
            정확한 날짜를 알려 드립니다.
        </p>
    `;
}
