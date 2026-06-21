// 일회성 빌드 스크립트: 농업기상 관측지점(obsr_Spot_Code) 목록에 좌표를 붙여
// frontend에서 쓸 정적 JSON으로 저장합니다. 정부 API의 관측지점 목록이 바뀌면 다시 실행하세요.
//
// 사용법: node backend/scripts/buildAgriStations.js
const fs = require("fs");
const path = require("path");

const API_KEY = process.env.PUBLIC_DATA_API_KEY;
const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;

function extractXmlTag(xml, tag) {
    const match = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
    return match ? match[1].trim() : "";
}

async function fetchAllSpots() {
    const url = `https://apis.data.go.kr/1390802/AgriWeather/WeatherObsrInfo/GrdlInfo/getWeatherZoneCodeList?serviceKey=${API_KEY}&Page_No=1&Page_Size=200`;
    const xml = await (await fetch(url)).text();

    const zoneChunks = xml.split("<zone_Spot_List>");
    const spots = [];
    for (let i = 1; i < zoneChunks.length; i++) {
        const listChunk = zoneChunks[i].split("</zone_Spot_List>")[0];
        const itemChunks = listChunk.split("<item>").slice(1).map((c) => c.split("</item>")[0]);
        for (const chunk of itemChunks) {
            const code = extractXmlTag(chunk, "obsr_Spot_Code");
            const name = extractXmlTag(chunk, "obsr_Spot_Nm");
            if (code && name) spots.push({ code, name });
        }
    }
    return spots;
}

async function geocode(name) {
    const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(name)}`;
    const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KAKAO_REST_API_KEY}` } });
    const data = await res.json();
    const doc = data.documents && data.documents[0];
    return doc ? { lat: parseFloat(doc.y), lng: parseFloat(doc.x) } : null;
}

async function main() {
    const spots = await fetchAllSpots();
    console.log(`📍 관측지점 ${spots.length}개 수집, 좌표 변환 시작...`);

    const result = [];
    const failed = [];

    for (const spot of spots) {
        const coords = await geocode(spot.name);
        if (coords) {
            result.push({ id: spot.code, name: spot.name, lat: coords.lat, lng: coords.lng });
        } else {
            failed.push(spot);
        }
        await new Promise((r) => setTimeout(r, 80));
    }

    console.log(`✅ 성공 ${result.length}개, 실패 ${failed.length}개`);
    if (failed.length) console.log("실패 목록:", failed.map((s) => `${s.code}:${s.name}`).join(", "));

    const outPath = path.join(__dirname, "..", "..", "js", "agriStations.js");
    const content = `// 자동 생성 파일 — backend/scripts/buildAgriStations.js로 생성됨. 직접 수정하지 마세요.\nconst AGRI_STATIONS = ${JSON.stringify(result, null, 2)};\n`;
    fs.writeFileSync(outPath, content, "utf-8");
    console.log(`💾 저장 완료: ${outPath}`);
}

main().catch((err) => {
    console.error("❌ 스크립트 실패:", err);
    process.exit(1);
});
