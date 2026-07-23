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
  // 경기도 추가
  "과천":   { lat: 37.4292, lon: 126.9876, name: "과천" },
  "의왕":   { lat: 37.3447, lon: 126.9682, name: "의왕" },
  "여주":   { lat: 37.2982, lon: 127.6375, name: "여주" },
  "양평":   { lat: 37.4915, lon: 127.4874, name: "양평" },
  "동두천": { lat: 37.9035, lon: 127.0607, name: "동두천" },
  "가평":   { lat: 37.8315, lon: 127.5102, name: "가평" },
  "연천":   { lat: 38.0960, lon: 127.0749, name: "연천" },
  // 강원도 추가
  "화천":   { lat: 38.1065, lon: 127.7082, name: "화천" },
  "양구":   { lat: 38.1059, lon: 127.9894, name: "양구" },
  "인제":   { lat: 38.0694, lon: 128.1706, name: "인제" },
  "고성":   { lat: 38.3806, lon: 128.4679, name: "고성" },
  "양양":   { lat: 38.0752, lon: 128.6191, name: "양양" },
  "철원":   { lat: 38.1461, lon: 127.3135, name: "철원" },
  "영월":   { lat: 37.1838, lon: 128.4617, name: "영월" },
  // 충청북도 추가
  "보은":   { lat: 36.4894, lon: 127.7295, name: "보은" },
  "옥천":   { lat: 36.3062, lon: 127.5709, name: "옥천" },
  "영동":   { lat: 36.1749, lon: 127.7759, name: "영동" },
  "증평":   { lat: 36.7854, lon: 127.5815, name: "증평" },
  "진천":   { lat: 36.8554, lon: 127.4358, name: "진천" },
  "괴산":   { lat: 36.8154, lon: 127.7862, name: "괴산" },
  "음성":   { lat: 36.9399, lon: 127.6908, name: "음성" },
  "단양":   { lat: 36.9847, lon: 128.3654, name: "단양" },
  // 충청남도 추가
  "서산":   { lat: 36.7845, lon: 126.4503, name: "서산" },
  "보령":   { lat: 36.3332, lon: 126.6128, name: "보령" },
  "태안":   { lat: 36.7453, lon: 126.2977, name: "태안" },
  "홍성":   { lat: 36.6012, lon: 126.6607, name: "홍성" },
  "당진":   { lat: 36.8895, lon: 126.6458, name: "당진" },
  "청양":   { lat: 36.4594, lon: 126.8027, name: "청양" },
  "서천":   { lat: 36.0801, lon: 126.6913, name: "서천" },
  "예산":   { lat: 36.6805, lon: 126.8497, name: "예산" },
  "금산":   { lat: 36.1088, lon: 127.4884, name: "금산" },
  "부여":   { lat: 36.2753, lon: 126.9098, name: "부여" },
  // 전라북도 추가
  "정읍":   { lat: 35.5699, lon: 126.8555, name: "정읍" },
  "남원":   { lat: 35.4163, lon: 127.3900, name: "남원" },
  "완주":   { lat: 35.9057, lon: 127.1622, name: "완주" },
  "무주":   { lat: 35.9070, lon: 127.6607, name: "무주" },
  "고창":   { lat: 35.4365, lon: 126.7016, name: "고창" },
  "부안":   { lat: 35.7318, lon: 126.7329, name: "부안" },
  "임실":   { lat: 35.6178, lon: 127.2895, name: "임실" },
  "장수":   { lat: 35.6476, lon: 127.5216, name: "장수" },
  "진안":   { lat: 35.7914, lon: 127.4246, name: "진안" },
  "순창":   { lat: 35.3743, lon: 127.1378, name: "순창" },
  // 전라남도 추가
  "나주":   { lat: 35.0159, lon: 126.7108, name: "나주" },
  "담양":   { lat: 35.3216, lon: 126.9883, name: "담양" },
  "고흥":   { lat: 34.6044, lon: 127.2780, name: "고흥" },
  "보성":   { lat: 34.7718, lon: 127.0803, name: "보성" },
  "화순":   { lat: 35.0645, lon: 126.9862, name: "화순" },
  "장흥":   { lat: 34.6814, lon: 126.9069, name: "장흥" },
  "강진":   { lat: 34.6421, lon: 126.7674, name: "강진" },
  "해남":   { lat: 34.5736, lon: 126.5990, name: "해남" },
  "영암":   { lat: 34.8007, lon: 126.6963, name: "영암" },
  "무안":   { lat: 34.9902, lon: 126.4816, name: "무안" },
  "함평":   { lat: 35.0651, lon: 126.5166, name: "함평" },
  "영광":   { lat: 35.2771, lon: 126.5119, name: "영광" },
  "완도":   { lat: 34.3101, lon: 126.7547, name: "완도" },
  "진도":   { lat: 34.4869, lon: 126.2634, name: "진도" },
  "구례":   { lat: 35.2025, lon: 127.4631, name: "구례" },
  "곡성":   { lat: 35.2820, lon: 127.2925, name: "곡성" },
  // 경상북도 추가
  "경산":   { lat: 35.8253, lon: 128.7413, name: "경산" },
  "영천":   { lat: 35.9733, lon: 128.9386, name: "영천" },
  "문경":   { lat: 36.5862, lon: 128.1867, name: "문경" },
  "의성":   { lat: 36.3524, lon: 128.6971, name: "의성" },
  "청송":   { lat: 36.4355, lon: 129.0573, name: "청송" },
  "영양":   { lat: 36.6671, lon: 129.1131, name: "영양" },
  "영덕":   { lat: 36.4154, lon: 129.3658, name: "영덕" },
  "청도":   { lat: 35.6476, lon: 128.7361, name: "청도" },
  "고령":   { lat: 35.7270, lon: 128.2637, name: "고령" },
  "성주":   { lat: 35.9187, lon: 128.2832, name: "성주" },
  "칠곡":   { lat: 35.9957, lon: 128.4014, name: "칠곡" },
  "예천":   { lat: 36.6576, lon: 128.4517, name: "예천" },
  "봉화":   { lat: 36.8935, lon: 128.7323, name: "봉화" },
  "울진":   { lat: 36.9932, lon: 129.4008, name: "울진" },
  "울릉":   { lat: 37.4844, lon: 130.9057, name: "울릉" },
  // 경상남도 추가
  "양산":   { lat: 35.3350, lon: 129.0368, name: "양산" },
  "사천":   { lat: 35.0035, lon: 128.0643, name: "사천" },
  "거창":   { lat: 35.6869, lon: 127.9093, name: "거창" },
  "하동":   { lat: 35.0668, lon: 127.7516, name: "하동" },
  "함안":   { lat: 35.2726, lon: 128.4062, name: "함안" },
  "창녕":   { lat: 35.5448, lon: 128.4923, name: "창녕" },
  "남해":   { lat: 34.8374, lon: 127.8924, name: "남해" },
  "산청":   { lat: 35.4151, lon: 127.8737, name: "산청" },
  "함양":   { lat: 35.5207, lon: 127.7254, name: "함양" },
  "합천":   { lat: 35.5668, lon: 128.1653, name: "합천" },
  "의령":   { lat: 35.3220, lon: 128.2614, name: "의령" },
};

// 도 단위 또는 별칭 쿼리 → 대표 도시 매핑
const ALIASES = {
  "경기":   "수원",   "경기도":   "수원",
  "강원":   "춘천",   "강원도":   "춘천",
  "충북":   "청주",   "충청북":   "청주",   "충청북도": "청주",
  "충남":   "천안",   "충청남":   "천안",   "충청남도": "천안",
  "전북":   "전주",   "전라북":   "전주",   "전라북도": "전주",
  "전남":   "목포",   "전라남":   "목포",   "전라남도": "목포",
  "경북":   "안동",   "경상북":   "안동",   "경상북도": "안동",
  "경남":   "창원",   "경상남":   "창원",   "경상남도": "창원",
  "제주도": "제주",   "제주특별자치": "제주",
};

function findCity(query) {
  const q = query.trim().replace(/특별시$|광역시$|특별자치시$|특별자치도$|도$|시$|군$|구$/, "").trim();
  return CITIES[q] ?? CITIES[ALIASES[q]] ?? CITIES[ALIASES[query.trim()]] ?? CITIES[query.trim()] ?? null;
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
