function nya(text) {
  const match = text.match(/^([\s\S]*?)([.!?]*)$/);
  const [, body, punctuation] = match;
  return `${body}냥${punctuation}`;
}

module.exports = { nya };
