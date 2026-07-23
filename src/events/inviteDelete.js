const { Events } = require("discord.js");
const { onInviteDelete } = require("../utils/inviteTracker");

module.exports = {
  name: Events.InviteDelete,
  execute(invite) {
    onInviteDelete(invite);
  },
};
