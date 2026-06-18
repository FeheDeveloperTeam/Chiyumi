const crypto = require("node:crypto");

const RANKS = [
  "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A",
];
const SUITS = ["♠", "♥", "♦", "♣"];

const sessions = new Map();

function drawCard() {
  const rank = RANKS[Math.floor(Math.random() * RANKS.length)];
  const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
  return { rank, suit };
}

function cardLabel(card) {
  return `${card.rank}${card.suit}`;
}

function handTotal(cards) {
  let total = 0;
  let aces = 0;

  for (const card of cards) {
    if (card.rank === "A") {
      aces += 1;
      total += 11;
    } else if (card.rank === "J" || card.rank === "Q" || card.rank === "K") {
      total += 10;
    } else {
      total += Number(card.rank);
    }
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }

  return total;
}

function isBlackjack(cards) {
  return cards.length === 2 && handTotal(cards) === 21;
}

function createSession(userId, bet) {
  const id = crypto.randomUUID();
  const session = {
    userId,
    bet,
    playerCards: [drawCard(), drawCard()],
    dealerCards: [drawCard(), drawCard()],
  };
  sessions.set(id, session);
  return { id, session };
}

function getSession(id) {
  return sessions.get(id);
}

function deleteSession(id) {
  sessions.delete(id);
}

module.exports = {
  drawCard,
  cardLabel,
  handTotal,
  isBlackjack,
  createSession,
  getSession,
  deleteSession,
};
