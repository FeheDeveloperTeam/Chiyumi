// Open-Meteo API 사용 (무료, API 키 불필요)

const CITIES = {
  "서울":   { lat: 37.5665, lon: 126.9780, name: "서울" },
  "부산":   { lat: 35.1796, lon: 129.0756, name: "부산" },
  "인천":   { lat: 37.4563, lon: 126.7052, name: "인천" },
  "대구":   { lat: 35.8714, lon: 128.6014, name: "대구" },
  "대전":   { lat: 36.3504, lon: 127.3845, name: "대전" },
  "광주":   { lat: 35.1595, lon: 126.8526, name: "광주" },
  "울산":   { lat: 35.5384, lon: 129.3114, name: "울산" },
  "세종":   { lat: 36.4804, lon: 127.2890, name: "세종" },
  "수원":   { lat: 37.2636, lon: 127.0286, name: "수원" },
  "성남":   { lat: 37.4449, lon: 127.1388, name: "성남" },
  "고양":   { lat: 37.6583, lon: 126.8320, name: "고양" },
  "부천":   { lat: 37.5034, lon: 126.7660, name: "부천" },
  "용인":   { lat: 37.2342, lon: 127.2010, name: "용인" },
  "안산":   { lat: 37.3219, lon: 126.8309, name: "안산" },
  "안양":   { lat: 37.3943, lon: 126.9568, name: "안양" },
  "남양주": { lat: 37.6360, lon: 127.2165, name: "남양주" },
  "화성":   { lat: 37.1998, lon: 126.8314, name: "화성" },
  "의정부": { lat: 37.7382, lon: 127.0337, name: "의정부" },
  "평택":   { lat: 36.9921, lon: 127.1127, name: "평택" },
  "파주":   { lat: 37.7600, lon: 126.7798, name: "파주" },
  "시흥":   { lat: 37.3800, lon: 126.8027, name: "시흥" },
  "김포":   { lat: 37.6151, lon: 126.7157, name: "김포" },
  "광명":   { lat: 37.4784, lon: 126.8647, name: "광명" },
  "군포":   { lat: 37.3614, lon: 126.9352, name: "군포" },
  "하남":   { lat: 37.5395, lon: 127.2149, name: "하남" },
  "오산":   { lat: 37.1499, lon: 127.0776, name: "오산" },
  "이천":   { lat: 37.2723, lon: 127.4350, name: "이천" },
  "안성":   { lat: 37.0078, lon: 127.2799, name: "안성" },
  "구리":   { lat: 37.5943, lon: 127.1293, name: "구리" },
  "양주":   { lat: 37.7854, lon: 127.0456, name: "양주" },
  "포천":   { lat: 37.8944, lon: 127.2006, name: "포천" },
  "천안":   { lat: 36.8151, lon: 127.1139, name: "천안" },
  "청주":   { lat: 36.6424, lon: 127.4890, name: "청주" },
  "충주":   { lat: 36.9908, lon: 127.9260, name: "충주" },
  "아산":   { lat: 36.7897, lon: 127.0020, name: "아산" },
  "공주":   { lat: 36.4465, lon: 127.1190, name: "공주" },
  "논산":   { lat: 36.1869, lon: 127.0990, name: "논산" },
  "제천":   { lat: 37.1328, lon: 128.1907, name: "제천" },
  "전주":   { lat: 35.8242, lon: 127.1480, name: "전주" },
  "군산":   { lat: 35.9676, lon: 126.7368, name: "군산" },
  "익산":   { lat: 35.9483, lon: 126.9574, name: "익산" },
  "목포":   { lat: 34.8118, lon: 126.3922, name: "목포" },
  "여수":   { lat: 34.7604, lon: 127.6622, name: "여수" },
  "순천":   { lat: 34.9506, lon: 127.4873, name: "순천" },
  "광양":   { lat: 34.9404, lon: 127.6964, name: "광양" },
  "포항":   { lat: 36.0190, lon: 129.3435, name: "포항" },
  "창원":   { lat: 35.2285, lon: 128.6811, name: "창원" },
  "구미":   { lat: 36.1196, lon: 128.3444, name: "구미" },
  "경주":   { lat: 35.8562, lon: 129.2246, name: "경주" },
  "김해":   { lat: 35.2285, lon: 128.8892, name: "김해" },
  "진주":   { lat: 35.1798, lon: 128.1076, name: "진주" },
  "통영":   { lat: 34.8544, lon: 128.4330, name: "통영" },
  "안동":   { lat: 36.5684, lon: 128.7294, name: "안동" },
  "거제":   { lat: 34.8800, lon: 128.6210, name: "거제" },
  "영주":   { lat: 36.8056, lon: 128.6239, name: "영주" },
  "상주":   { lat: 36.4108, lon: 128.1591, name: "상주" },
  "밀양":   { lat: 35.5038, lon: 128.7458, name: "밀양" },
  "춘천":   { lat: 37.8813, lon: 127.7298, name: "춘천" },
  "강릉":   { lat: 37.7519, lon: 128.8760, name: "강릉" },
  "원주":   { lat: 37.3422, lon: 127.9202, name: "원주" },
  "속초":   { lat: 38.2048, lon: 128.5912, name: "속초" },
  "동해":   { lat: 37.5244, lon: 129.1140, name: "동해" },
  "삼척":   { lat: 37.4499, lon: 129.1657, name: "삼척" },
  "태백":   { lat: 37.1637, lon: 128.9852, name: "태백" },
  "홍천":   { lat: 37.6973, lon: 127.8878, name: "홍천" },
  "횡성":   { lat: 37.4919, lon: 127.9843, name: "횡성" },
  "평창":   { lat: 37.3722, lon: 128.3908, name: "평창" },
  "정선":   { lat: 37.3799, lon: 128.6604, name: "정선" },
  "제주":   { lat: 33.4996, lon: 126.5312, name: "제주" },
  "서귀포": { lat: 33.2541, lon: 126.5600, name: "서귀포" },
};

function findCity(query) {
  const q = query.trim().replace(/특별시$|광역시$|특별자치시$|특별자치도$|시$|군$|구$/, "").trim();
  return CITIES[q] ?? CITIES[query.trim()] ?? null;
}

function weatherCodeToCondition(code) {
  if (code === 0 || code === 1)                return { sky: 1, pty: 0 };
  if (code === 2)                              return { sky: 3, pty: 0 };
  if (code === 3 || code === 45 || code === 48) return { sky: 4, pty: 0 };
  if (code >= 51 && code <= 55)               return { sky: 4, pty: 1 };
  if (code === 56 || code === 57)             return { sky: 4, pty: 2 };
  if (code >= 61 && code <= 65)              return { sky: 4, pty: 1 };
  if (code === 66 || code === 67)             return { sky: 4, pty: 2 };
  if (code >= 71 && code <= 77)              return { sky: 4, pty: 3 };
  if (code >= 80 && code <= 82)              return { sky: 4, pty: 4 };
  if (code === 85 || code === 86)             return { sky: 4, pty: 3 };
  if (code >= 95)                             return { sky: 4, pty: 1 };
  return { sky: 1, pty: 0 };
}

function getNowKST() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, "0");
  return {
    fcstDate: `${kst.getUTCFullYear()}${pad(kst.getUTCMonth() + 1)}${pad(kst.getUTCDate())}`,
    fcstTime: `${pad(kst.getUTCHours())}00`,
  };
}

async function getWeather(cityQuery) {
  const city = findCity(cityQuery);
  if (!city) return null;

  const weatherUrl =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${city.lat}&longitude=${city.lon}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m` +
    `,wind_speed_10m,wind_gusts_10m,precipitation_probability,weather_code` +
    `&wind_speed_unit=ms&timezone=Asia%2FSeoul`;

  const aqUrl =
    `https://air-quality-api.open-meteo.com/v1/air-quality` +
    `?latitude=${city.lat}&longitude=${city.lon}` +
    `&current=pm2_5&timezone=Asia%2FSeoul`;

  const [weatherRes, aqRes] = await Promise.all([fetch(weatherUrl), fetch(aqUrl)]);
  const [weatherJson, aqJson] = await Promise.all([weatherRes.json(), aqRes.json()]);

  const cur = weatherJson?.current;
  if (!cur) return null;

  const pm25 = Math.round(aqJson?.current?.pm2_5 ?? -1);
  const { sky, pty } = weatherCodeToCondition(cur.weather_code ?? 0);
  const { fcstDate, fcstTime } = getNowKST();

  return {
    cityName:     city.name,
    temperature:  Math.round(cur.temperature_2m ?? 0).toString(),
    apparentTemp: Math.round(cur.apparent_temperature ?? 0).toString(),
    humidity:     Math.round(cur.relative_humidity_2m ?? 0).toString(),
    windSpeed:    (cur.wind_speed_10m  ?? 0).toFixed(1),
    windGust:     (cur.wind_gusts_10m  ?? 0).toFixed(1),
    precipProb:   Math.round(cur.precipitation_probability ?? 0).toString(),
    pm25,
    sky,
    pty,
    fcstDate,
    fcstTime,
  };
}

function getWeatherComment(weather) {
  const temp = parseInt(weather.temperature);
  const { pty, sky, cityName, windGust, pm25 } = weather;
  const gust = parseFloat(windGust);

  let cond;
  if      (gust >= 25)              cond = `🚨 오늘 ${cityName} 강한 태풍급 강풍이냥!! 절대 외출하지 말라냥!`;
  else if (gust >= 17)              cond = `⚠️ 오늘 ${cityName} 태풍급 강풍이냥! 외출 자제해달라냥!`;
  else if (gust >= 14)              cond = `오늘 ${cityName} 강풍 주의냥... 💨 바람 세냥!`;
  else if (pty === 3)               cond = `오늘 ${cityName}에 눈이 내리냥~! ❄️`;
  else if (pty === 2)               cond = `오늘 ${cityName}에 비와 눈이 같이 오냥... 🌨️`;
  else if (pty === 1 || pty === 4)  cond = `오늘 ${cityName}에 비가 오냥... ☔`;
  else if (sky === 4)               cond = `오늘 ${cityName} 하늘이 흐리냥 ☁️`;
  else if (sky === 3)               cond = `오늘 ${cityName} 구름이 좀 있냥 ⛅`;
  else                              cond = `오늘 ${cityName} 날씨 맑냥! ☀️`;

  // 날씨 상황에 맞는 온도 코멘트
  let tempComment;
  if (gust >= 14) {
    tempComment = gust >= 25 ? "집에 있어달라냥!" : "외출할 때 조심하라냥!";
  } else if (pty === 3) {
    tempComment = temp <= 0
      ? "엄청 춥고 눈도 오냥... ⛄ 두껍게 입고 미끄럼 조심해달라냥!"
      : "미끄럽지 않게 조심해달라냥!";
  } else if (pty === 2) {
    tempComment = "미끄럽고 비도 오냥... ☔ 조심해달라냥!";
  } else if (pty === 1 || pty === 4) {
    if      (temp > 28) tempComment = "덥고 비까지 오는 불쾌한 날씨냥... 😮‍💨 우산 챙겨달라냥!";
    else if (temp > 20) tempComment = "우산 꼭 챙겨달라냥!";
    else if (temp > 10) tempComment = "쌀쌀하냥~ 🧥 우산이랑 겉옷 챙겨달라냥!";
    else                tempComment = "춥고 비도 오냥... 😭 따뜻하게 입고 우산 챙겨달라냥!";
  } else {
    if      (temp <= 0)  tempComment = "엄청 춥냥... 🧣 두껍게 입어달라냥!";
    else if (temp <= 10) tempComment = "꽤 쌀쌀하냥! 🧥 따뜻하게 입고 다녀달라냥~";
    else if (temp <= 20) tempComment = "선선하냥~ 겉옷 하나 챙겨달라냥!";
    else if (temp <= 28) tempComment = "따뜻하냥! 기분 좋은 날씨다냥~";
    else                 tempComment = "엄청 덥냥! 🥵 물 많이 마셔달라냥!";
  }

  let dustComment = "";
  if      (pm25 >= 75) dustComment = " 미세먼지도 매우 나쁨이냥! 😷 마스크 꼭 써달라냥!";
  else if (pm25 >= 36) dustComment = " 미세먼지 나쁨이냥~ 😷 마스크 챙겨달라냥!";

  return `${cond} ${tempComment}${dustComment}`;
}

module.exports = { getWeather, findCity, getWeatherComment };
