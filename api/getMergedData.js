const API_KEY = "J%2B8ZoE1PgKUQoUs79qH%2FxJComkSECB1tyoh8n1lC4c0cXSoxpOqqeuX9U0pjSoE1wLjE3kplEH46yQobBS0o1g%3D%3D";
// 실제 배포 시에는 Vercel의 Environment Variables(환경 변수) 기능에 키를 숨기고 
// process.env.PUBLIC_API_KEY 형태로 불러오는 것이 안전합니다.

async function fetchAsosHourlyWeather(stnId, dateStr, timeStr) { /* 기존 로직 동일 */ }
async function fetchAgri10MinWeather(stationId, searchDate) { /* 기존 로직 동일 */ }
async function fetchSoilChemicalStatistics(stdgCd) { /* 기존 로직 동일 */ }

// 🎯 [핵심] Vercel Serverless Function 기본 포맷
export default async function handler(req, res) {
    // 🌟 [핵심 해결책] CORS 보안 정책 허용 (모든 곳에서 요청 가능하도록 문을 열어둠)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // 사전 요청(OPTIONS)에 대한 빠른 응답
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 프론트엔드에서 GET 요청으로 보낸 파라미터 추출
    const { stnId, stationId, stdgCd, dateStr, timeStr } = req.query;

    try {
        console.log("🚀 [Vercel 백엔드] 공공 API 병렬 수집 파이프라인 가동");

        // 여기서 각 API 호출 함수들이 실제로는 구현되어 있어야 합니다.
        // 현재는 주석으로 처리되어 있으므로, 실제 구현 코드가 필요합니다.
        // 임시로 Mock 데이터를 반환하도록 수정하거나 실제 코드를 넣어주세요.
        // 아래는 실제 함수가 구현되어 있다고 가정하고 작성된 코드입니다.
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