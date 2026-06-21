// api/getMergedData.js

const API_KEY = "J%2B8ZoE1PgKUQoUs79qH%2FxJComkSECB1tyoh8n1lC4c0cXSoxpOqqeuX9U0pjSoE1wLjE3kplEH46yQobBS0o1g%3D%3D";
// 실제 배포 시에는 Vercel의 Environment Variables(환경 변수) 기능에 키를 숨기고 
// process.env.PUBLIC_API_KEY 형태로 불러오는 것이 안전합니다.

async function fetchAsosHourlyWeather(stnId, dateStr, timeStr) { /* 기존 로직 동일 */ }
async function fetchAgri10MinWeather(stationId, searchDate) { /* 기존 로직 동일 */ }
async function fetchSoilChemicalStatistics(stdgCd) { /* 기존 로직 동일 */ }

// 🎯 [핵심] Vercel Serverless Function 기본 포맷
export default async function handler(req, res) {
    // 프론트엔드에서 GET 요청으로 보낸 파라미터 추출
    const { stnId, stationId, stdgCd, dateStr, timeStr } = req.query;

    try {
        console.log("🚀 [Vercel 백엔드] 공공 API 병렬 수집 파이프라인 가동");

        const [asosWeather, agriWeather, soilChemical] = await Promise.all([
            fetchAsosHourlyWeather(stnId || "108", dateStr, timeStr),
            fetchAgri10MinWeather(stationId, dateStr),
            fetchSoilChemicalStatistics(stdgCd)
        ]);

        const finalIntegratedData = {
            airTemp: asosWeather.airTemp,
            rain: asosWeather.rain,
            solarRadiation: asosWeather.solarRadiation,
            soilTemp: agriWeather.soilTemp10cm,
            soilMoisture: agriWeather.soilMoisture10cm,
            soilPh: soilChemical.averagePh,
            soilOrganic: soilChemical.organicMatter,
            soilPhosphate: soilChemical.availablePhosphate,
            timestamp: new Date().toLocaleString()
        };

        // localStorage 대신, 프론트엔드로 JSON 데이터 직접 응답 전송!
        res.status(200).json(finalIntegratedData);

    } catch (error) {
        console.error("❌ 파이프라인 에러:", error);
        res.status(500).json({ error: "데이터 융합 중 서버 에러 발생" });
    }
}