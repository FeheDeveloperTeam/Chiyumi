function formatLevelUpMessage(template, { user, level }) {
  return template.replaceAll("{유저}", `${user}`).replaceAll("{레벨}", `${level}`);
}

module.exports = { formatLevelUpMessage };
