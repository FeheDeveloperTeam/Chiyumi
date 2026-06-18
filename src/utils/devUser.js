const DEV_USER_ID = "1517171143193268346";

function isDeveloper(userId) {
  return userId === DEV_USER_ID;
}

module.exports = { DEV_USER_ID, isDeveloper };
