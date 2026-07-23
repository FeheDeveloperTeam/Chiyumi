const CITY_GRID = {
  // 특별시·광역시
  "서울":   { nx: 60,  ny: 127, name: "서울" },
  "부산":   { nx: 98,  ny: 76,  name: "부산" },
  "인천":   { nx: 55,  ny: 124, name: "인천" },
  "대구":   { nx: 89,  ny: 90,  name: "대구" },
  "대전":   { nx: 67,  ny: 100, name: "대전" },
  "광주":   { nx: 58,  ny: 74,  name: "광주" },
  "울산":   { nx: 102, ny: 84,  name: "울산" },
  "세종":   { nx: 66,  ny: 103, name: "세종" },
  // 경기
  "수원":   { nx: 60,  ny: 121, name: "수원" },
  "성남":   { nx: 62,  ny: 123, name: "성남" },
  "고양":   { nx: 57,  ny: 128, name: "고양" },
  "부천":   { nx: 56,  ny: 125, name: "부천" },
  "용인":   { nx: 62,  ny: 120, name: "용인" },
  "안산":   { nx: 57,  ny: 121, name: "안산" },
  "안양":   { nx: 59,  ny: 123, name: "안양" },
  "남양주": { nx: 64,  ny: 128, name: "남양주" },
  "화성":   { nx: 57,  ny: 119, name: "화성" },
  "의정부": { nx: 61,  ny: 130, name: "의정부" },
  "평택":   { nx: 62,  ny: 114, name: "평택" },
  "파주":   { nx: 56,  ny: 131, name: "파주" },
  "시흥":   { nx: 57,  ny: 122, name: "시흥" },
  "김포":   { nx: 55,  ny: 128, name: "김포" },
  "광명":   { nx: 58,  ny: 123, name: "광명" },
  "군포":   { nx: 59,  ny: 120, name: "군포" },
  "하남":   { nx: 64,  ny: 126, name: "하남" },
  "오산":   { nx: 62,  ny: 117, name: "오산" },
  "이천":   { nx: 68,  ny: 121, name: "이천" },
  "안성":   { nx: 65,  ny: 115, name: "안성" },
  "구리":   { nx: 63,  ny: 127, name: "구리" },
  "의왕":   { nx: 60,  ny: 121, name: "의왕" },
  "양주":   { nx: 61,  ny: 131, name: "양주" },
  "포천":   { nx: 64,  ny: 134, name: "포천" },
  // 충청
  "천안":   { nx: 63,  ny: 110, name: "천안" },
  "청주":   { nx: 69,  ny: 107, name: "청주" },
  "충주":   { nx: 76,  ny: 114, name: "충주" },
  "아산":   { nx: 58,  ny: 111, name: "아산" },
  "공주":   { nx: 63,  ny: 102, name: "공주" },
  "논산":   { nx: 62,  ny: 97,  name: "논산" },
  "제천":   { nx: 81,  ny: 118, name: "제천" },
  // 전라
  "전주":   { nx: 63,  ny: 89,  name: "전주" },
  "군산":   { nx: 56,  ny: 92,  name: "군산" },
  "익산":   { nx: 60,  ny: 91,  name: "익산" },
  "목포":   { nx: 50,  ny: 67,  name: "목포" },
  "여수":   { nx: 73,  ny: 66,  name: "여수" },
  "순천":   { nx: 70,  ny: 70,  name: "순천" },
  "광양":   { nx: 74,  ny: 72,  name: "광양" },
  // 경상
  "포항":   { nx: 102, ny: 94,  name: "포항" },
  "창원":   { nx: 91,  ny: 77,  name: "창원" },
  "구미":   { nx: 84,  ny: 96,  name: "구미" },
  "경주":   { nx: 100, ny: 91,  name: "경주" },
  "김해":   { nx: 95,  ny: 77,  name: "김해" },
  "진주":   { nx: 81,  ny: 75,  name: "진주" },
  "통영":   { nx: 87,  ny: 68,  name: "통영" },
  "안동":   { nx: 91,  ny: 106, name: "안동" },
  "거제":   { nx: 98,  ny: 68,  name: "거제" },
  "영주":   { nx: 88,  ny: 111, name: "영주" },
  "상주":   { nx: 81,  ny: 103, name: "상주" },
  "밀양":   { nx: 96,  ny: 83,  name: "밀양" },
  // 강원
  "춘천":   { nx: 73,  ny: 134, name: "춘천" },
  "강릉":   { nx: 92,  ny: 131, name: "강릉" },
  "원주":   { nx: 76,  ny: 122, name: "원주" },
  "속초":   { nx: 87,  ny: 141, name: "속초" },
  "동해":   { nx: 97,  ny: 127, name: "동해" },
  "삼척":   { nx: 99,  ny: 124, name: "삼척" },
  "태백":   { nx: 95,  ny: 119, name: "태백" },
  "홍천":   { nx: 75,  ny: 130, name: "홍천" },
  "횡성":   { nx: 77,  ny: 125, name: "횡성" },
  "평창":   { nx: 84,  ny: 123, name: "평창" },
  "정선":   { nx: 89,  ny: 123, name: "정선" },
  // 제주
  "제주":   { nx: 52,  ny: 38,  name: "제주" },
  "서귀포": { nx: 52,  ny: 33,  name: "서귀포" },
};

function findCity(query) {
  const q = query.trim().replace(/특별시$|광역시$|특별자치시$|특별자치도$|시$|군$|구$/, "").trim();
  return CITY_GRID[q] ?? CITY_GRID[query.trim()] ?? null;
}

function getBaseDateTime() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);

  const pad = (n) => String(n).padStart(2, "0");
  const year  = kst.getUTCFullYear();
  const month = pad(kst.getUTCMonth() + 1);
  const day   = pad(kst.getUTCDate());
  const hour  = kst.getUTCHours();
  const min   = kst.getUTCMinutes();

  const BASE_HOURS = [2, 5, 8, 11, 14, 17, 20, 23];
  const curMinutes = hour * 60 + min - 10; // 10분 여유

  if (curMinutes < 2 * 60) {
    const prev = new Date(kst.getTime() - 24 * 60 * 60 * 1000);
    return {
      base_date: `${prev.getUTCFullYear()}${pad(prev.getUTCMonth() + 1)}${pad(prev.getUTCDate())}`,
      base_time: "2300",
    };
  }

  let baseHour = BASE_HOURS[0];
  for (const h of BASE_HOURS) {
    if (h * 60 <= curMinutes) baseHour = h;
  }

  return { base_date: `${year}${month}${day}`, base_time: pad(baseHour) + "00" };
}

async function getWeather(cityQuery) {
  const city = findCity(cityQuery);
  if (!city) return null;

  const { base_date, base_time } = getBaseDateTime();
  const key = process.env.KMA_API_KEY;

  const params = new URLSearchParams({
    serviceKey: key,
    pageNo: "1",
    numOfRows: "100",
    dataType: "JSON",
    base_date,
    base_time,
    nx: String(city.nx),
    ny: String(city.ny),
  });

  const res = await fetch(
    `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?${params}`,
  );
  const json = await res.json();

  const items = json?.response?.body?.items?.item;
  if (!Array.isArray(items)) return null;

  const times = [...new Set(items.map((i) => i.fcstTime))].sort();
  const t = times[0];
  const get = (cat) => items.find((i) => i.category === cat && i.fcstTime === t)?.fcstValue;

  return {
    cityName:   city.name,
    temperature: get("TMP") ?? "?",
    humidity:    get("REH") ?? "?",
    windSpeed:   get("WSD") ?? "?",
    precipProb:  get("POP") ?? "?",
    sky: parseInt(get("SKY") ?? "1"),
    pty: parseInt(get("PTY") ?? "0"),
    fcstDate: base_date,
    fcstTime: t,
  };
}

function getWeatherComment(weather) {
  const temp = parseInt(weather.temperature);
  const { pty, sky, cityName } = weather;

  let cond;
  if      (pty === 3)          cond = `오늘 ${cityName}에 눈이 내리냥~! ❄️`;
  else if (pty === 2)          cond = `오늘 ${cityName}에 비와 눈이 같이 오냥... 🌨️`;
  else if (pty === 1 || pty === 4) cond = `오늘 ${cityName}에 비가 오냥... ☔`;
  else if (sky === 4)          cond = `오늘 ${cityName} 하늘이 흐리냥 ☁️`;
  else if (sky === 3)          cond = `오늘 ${cityName} 구름이 좀 있냥 ⛅`;
  else                         cond = `오늘 ${cityName} 날씨 맑냥! ☀️`;

  let tempComment;
  if      (temp <= 0)  tempComment = "엄청 춥냥... 🧣 두껍게 입어달라냥!";
  else if (temp <= 10) tempComment = "꽤 쌀쌀하냥! 🧥 따뜻하게 입고 다녀달라냥~";
  else if (temp <= 20) tempComment = "선선하냥~ 겉옷 하나 챙겨달라냥!";
  else if (temp <= 28) tempComment = "따뜻하냥! 기분 좋은 날씨다냥~";
  else                 tempComment = "엄청 덥냥! 🥵 물 많이 마셔달라냥!";

  return `${cond} ${tempComment}`;
}

module.exports = { getWeather, findCity, getWeatherComment };
