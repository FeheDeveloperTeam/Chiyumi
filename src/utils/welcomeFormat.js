function formatWelcomeMessage(template, { user, guild }) {
  return template.replaceAll("{유저}", `${user}`).replaceAll("{서버}", guild.name);
}

module.exports = { formatWelcomeMessage };
