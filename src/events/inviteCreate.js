const { Events } = require("discord.js");
const { onInviteCreate } = require("../utils/inviteTracker");

module.exports = {
  name: Events.InviteCreate,
  execute(invite) {
    onInviteCreate(invite);
  },
};
