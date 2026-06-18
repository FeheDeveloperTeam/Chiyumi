const DEV_USER_ID = "826036359499481109";

function isDeveloper(userId) {
  return userId === DEV_USER_ID;
}

module.exports = { DEV_USER_ID, isDeveloper };
