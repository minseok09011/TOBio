// microbe_disclosure.csv에서 죽은 형식(shopping.naver.com/product/<id>)의 online_url을
// 네이버 쇼핑 검색 API로 다시 찾아 실제로 접속 가능한 URL로 교체.
//
// 사용법:
//   1) backend/.env 에 NAVER_ID, NAVER_SECRET 설정
//   2) cd backend && node scripts/refreshNaverUrls.js
//   3) 실행 후 git diff backend/microbe_disclosure.csv 로 변경 확인
//      보고서: backend/data/refresh_report.txt
//
// 매칭 우선순위:
//   1. 비로그인 접근 가능한 link (옥션/쿠팡/카탈로그/G마켓 등) 직접 사용
//   2. 없으면 smartstore.naver.com/main/products/<id> (로그인 후 상품 페이지) 사용
//   3. 그것도 없으면 URL 비움 — 잘못된 상품으로 안내하지 않고 전화/주소 안내로 폴백
//      ※ 검색결과 페이지 폴백은 일부러 안 함. 사용자에게 정확하지 않은 결과 페이지를
//        보여주는 것보다, 구매 버튼을 숨기는 게 UX상 더 명확함.
//
// 로직 기반: 사용자가 보낸 기존 gate3_verify_v2.py.
//   변경 1: squash()에서 "괄호 안 내용 제거" 규칙 제거 — title이 "트리코마 (입제)" 식인
//           케이스에서 핵심 키워드가 제거되어 매칭 실패하던 버그.
//   변경 2: 토큰 매칭을 prefix → 부분 토큰 전부 포함으로 변경 — title이 "님비티 대유"
//           처럼 어순이 바뀐 케이스에서도 매칭됨.
//   변경 3: AGRI_CAT에서 "종자" 제거하고 BLOCK_CAT에 추가 — 미생물제 brand가 우연히
//           씨앗 상품 제목과 토큰이 겹치는 오매칭 차단.
//
// ── 미생물 자재 262건 분류 결과 (2026-06-29 스크립트 1차 실행 기준) ────────────
//
// 전체 262건
// ├─ 구매 링크 있음: 115건
// │  ├─ 직접 상품 페이지 (비로그인 OK): 96건
// │  │  ├─ 네이버 가격비교 (search.shopping.naver.com/catalog): 52
// │  │  ├─ 쿠팡 (link.coupang.com): 22
// │  │  ├─ plantprotector.co.kr: 8
// │  │  ├─ nongdal.co.kr: 5
// │  │  ├─ 한농원.kr: 4
// │  │  ├─ 옥션 (link.auction.co.kr): 2
// │  │  ├─ 11번가 / nongsastore.co.kr / G마켓 (link.gmarket.co.kr): 각 1
// │  └─ 로그인 후 상품 페이지 (smartstore.naver.com/main/products/<id>): 19건
// │     └─ 네이버에 작은 농약사·종묘사 mall만 입점한 케이스
// │        — 비로그인 가능한 link가 존재하지 않아 어쩔 수 없이 로그인 필수 URL 사용
// └─ 구매 링크 없음 (전화/주소만 안내): 147건
//    ├─ 원래부터 online_url이 비어있던 행: 145건 (CSV 수집 시점에 미입력)
//    └─ 이번 스크립트로 매칭 시도했으나 잘못된 상품 매칭 위험으로 비움: 2건
//       (대유닥터푸란트 액제, 네박자 — 네이버에 정확한 미생물제 상품이 없음)
//
// 이번 스크립트로 갱신한 63건 (= 갱신 전 shopping.naver.com/product/<id> 형식이던 행):
//   - OK       (비로그인 직접 매칭): 42건
//   - OK_LOGIN (로그인 후 상품 페이지): 19건
//   - EMPTY    (매칭 실패, URL 비움): 2건
// ────────────────────────────────────────────────────────────────────────────
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");

const NAVER_ID = process.env.NAVER_ID;
const NAVER_SECRET = process.env.NAVER_SECRET;
if (!NAVER_ID || !NAVER_SECRET) {
    console.error("⚠️  backend/.env 에 NAVER_ID, NAVER_SECRET 를 채워주세요.");
    process.exit(1);
}

const CSV_PATH = path.join(__dirname, "..", "microbe_disclosure.csv");
const REPORT_PATH = path.join(__dirname, "..", "data", "refresh_report.txt");
const DEAD_PREFIX = "https://shopping.naver.com/product/";

// 통과시킬 농자재 카테고리 키워드. 원본 gate3_verify_v2.py에서 "종자"를 BLOCK으로 옮김 —
// 미생물제 brand가 우연히 "네박자오이씨앗" 같은 종자 상품 제목과 토큰이 겹쳐서 잘못 매칭되는 케이스 차단.
const AGRI_CAT = ["비료", "농약", "농자재", "원예", "살충", "살균", "미생물", "퇴비", "친환경농", "농업용", "원예자재"];
const BLOCK_CAT = ["가방", "패션", "의류", "신발", "화장품", "식품", "건강식품", "반려", "완구", "가전", "디지털", "도서", "문구", "종자", "모종", "세제"];

const stripTags = (s) => String(s || "").replace(/<.*?>/g, "").trim();

// 비교용 강정규화: 공백/하이픈/법인접두어/괄호기호만 제거, 소문자화.
// 괄호 안 내용은 보존 — 검색결과 제목이 "트리코마 (입제) 5Kg" 같이 핵심 키워드를
// 괄호 안에 넣는 경우가 있어, 안을 통째로 빼면 토큰 매칭이 실패함.
// brand 쪽은 coreBrand()가 이미 (성분설명) 부분을 제거하므로 영향 없음.
function squash(s) {
    let t = String(s || "");
    t = t.replace(/[\s\-_,./~]/g, "");
    t = t.replace(/[㈜()주식회사농업회사법인영농조합]/g, "");
    return t.toLowerCase();
}
const coreBrand = (b) => String(b || "").replace(/\(.*?\)/g, "").trim();

async function naverSearch(query) {
    if (!query.trim()) return [];
    const url = `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(query)}&display=10&sort=sim`;
    try {
        const res = await fetch(url, {
            headers: { "X-Naver-Client-Id": NAVER_ID, "X-Naver-Client-Secret": NAVER_SECRET },
            signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) {
            const text = await res.text().catch(() => "");
            console.warn(`  ⚠️  API ${res.status}: ${text.slice(0, 120)}`);
            return [];
        }
        const data = await res.json();
        return data.items || [];
    } catch (err) {
        console.warn(`  ⚠️  네트워크 오류: ${err.message}`);
        return [];
    }
}

// 비로그인 접근 불가 형식 (네이버가 사용자 세션으로 어느 스토어인지 추정하는 단축 URL).
// 시크릿 창에서는 로그인 페이지로 튀어버리므로 이 형식은 마지막에만 선택.
const LOGIN_REQUIRED_PATTERN = /smartstore\.naver\.com\/main\/products\//;

// 매칭 토큰: brand 음절을 2글자씩 묶은 부분 토큰들로 분해.
// 단순 prefix 매칭은 "대유님비티" vs title "님비티 대유"처럼 어순이 바뀐 경우 못 잡음.
// 모든 부분 토큰이 다 들어있어야 매칭으로 인정 → 어순이 달라도 정확도는 유지됨.
function brandTokens(brand) {
    const t = squash(coreBrand(brand));
    if (t.length < 2) return [];
    if (t.length <= 3) return [t]; // 짧은 brand는 통째로
    const tokens = [];
    for (let i = 0; i < t.length - 1; i++) tokens.push(t.slice(i, i + 2));
    return [...new Set(tokens)];
}

function pickUrl(items, brand) {
    const tokens = brandTokens(brand);
    if (tokens.length === 0) return null;

    // 농자재 카테고리 + 상표명 토큰 일치하는 후보들 수집
    const candidates = [];
    for (const it of items) {
        const cat = [it.category1, it.category2, it.category3, it.category4].map(stripTags).join(" ");
        const title = stripTags(it.title);
        if (BLOCK_CAT.some((b) => cat.includes(b))) continue;
        if (!AGRI_CAT.some((a) => cat.includes(a))) continue;
        const titleSq = squash(title);
        // 모든 부분 토큰이 title에 들어있어야 매칭 (어순 무관)
        if (tokens.every((tok) => titleSq.includes(tok))) candidates.push(it);
    }
    if (candidates.length === 0) return null;

    // 비로그인 접근 가능한 link(옥션/쿠팡/11번가/카탈로그 등) 우선
    const direct = candidates.find((c) => !LOGIN_REQUIRED_PATTERN.test(c.link || ""));
    if (direct) return direct.link;

    // 비로그인 가능한 link가 없으면 로그인 필수 형식이라도 사용 (로그인하면 진짜 상품 페이지 보임)
    return candidates[0].link;
}

async function verify(brand, vendor) {
    const cb = coreBrand(brand);
    const cv = coreBrand(vendor);
    let url = pickUrl(await naverSearch(`${cb} ${cv}`.trim()), brand);
    if (url) return url;
    url = pickUrl(await naverSearch(cb), brand);
    return url;
}

function csvField(v) {
    const s = String(v ?? "");
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
}

function writeCsv(headers, rows) {
    const head = headers.map(csvField).join(",");
    const body = rows.map((r) => headers.map((h) => csvField(r[h])).join(",")).join("\n");
    return "﻿" + head + "\n" + body + "\n";
}

async function main() {
    let raw = fs.readFileSync(CSV_PATH, "utf-8");
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
    const records = parse(raw, { columns: true, skip_empty_lines: true, relax_column_count: true });
    const headers = Object.keys(records[0]);

    const targets = records.filter((r) => (r.online_url || "").startsWith(DEAD_PREFIX));
    console.log(`🎯 갱신 대상: ${targets.length}건 / 전체 ${records.length}건`);
    if (targets.length === 0) {
        console.log("죽은 형식의 URL이 없습니다. 종료.");
        return;
    }

    const report = [];
    let i = 0;
    for (const row of targets) {
        i++;
        const brand = row["상표명(자재명)"];
        const vendor = row["사업자"];
        const oldUrl = row.online_url;
        const newUrl = await verify(brand, vendor);
        let status, finalUrl;
        if (newUrl) {
            // 로그인 필수 형식이면 OK_LOGIN으로 표시 (실제 상품 페이지긴 하지만 로그인 필요)
            status = LOGIN_REQUIRED_PATTERN.test(newUrl) ? "OK_LOGIN" : "OK";
            finalUrl = newUrl;
        } else {
            // 매칭 자체가 안 됨 → 검색 페이지로 보내면 잘못된 상품(세제/씨앗 등)이 뜰 위험 →
            // URL 비워서 클라이언트가 "온라인 구매" 버튼 숨기게 함 (전화/주소 안내로 폴백)
            status = "EMPTY";
            finalUrl = "";
        }
        row.online_url = finalUrl;
        report.push({ status, brand, vendor, oldUrl, newUrl: finalUrl });
        console.log(`[${i}/${targets.length}] ${brand} -> ${status}`);
        await new Promise((r) => setTimeout(r, 150)); // API 매너
    }

    fs.writeFileSync(CSV_PATH, writeCsv(headers, records), "utf-8");

    fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    const reportText = report
        .map((r) => `[${r.status}] ${r.brand} | ${r.vendor}\n  OLD: ${r.oldUrl}\n  NEW: ${r.newUrl}\n`)
        .join("\n");
    fs.writeFileSync(REPORT_PATH, reportText, "utf-8");

    const ok = report.filter((r) => r.status === "OK").length;
    const okLogin = report.filter((r) => r.status === "OK_LOGIN").length;
    const empty = report.filter((r) => r.status === "EMPTY").length;
    console.log(`\n✅ 완료: 직접 ${ok}건 / 로그인 필요 ${okLogin}건 / 매칭 실패(URL 비움) ${empty}건`);
    console.log(`📄 보고서: ${REPORT_PATH}`);
    console.log(`📝 git diff backend/microbe_disclosure.csv 로 변경 확인 후 커밋하세요.`);
}

main().catch((err) => {
    console.error("❌ 실패:", err);
    process.exit(1);
});
