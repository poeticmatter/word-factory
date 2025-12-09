export const GAME_CONFIG = {
  START_CASH: 10.0,
  MAX_SLOTS: 5,
  START_PATIENCE: 5,
  INFLATION_RATE: 1.5,
  DEFLATION_RATE: 0.8,
  BASE_REWARD: 3.5,
  PRICE_DECAY: 0.5,
  MIN_LETTER_COST: 0.1,
  CRITIC_THRESHOLDS: [20, 50, 100, 150],
  CRITIC_PATIENCE: 6,
};

export const SCRABBLE_DISTRIBUTION = {
  A: 9,
  B: 2,
  C: 2,
  D: 4,
  E: 12,
  F: 2,
  G: 3,
  H: 2,
  I: 9,
  J: 1,
  K: 1,
  L: 4,
  M: 2,
  N: 6,
  O: 8,
  P: 2,
  Q: 1,
  R: 6,
  S: 4,
  T: 6,
  U: 4,
  V: 2,
  W: 2,
  X: 1,
  Y: 2,
  Z: 1,
};

// 0-based Index mapping for 5-letter words
export const INVALID_POSITIONS = {
  0: ["X"], // No words starting with X
  3: ["Q"], // No Q in the 4th slot (needs a U after it)
  4: ["J", "Q", "V"], // No words ending in J, Q, V
};
