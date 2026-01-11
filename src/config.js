export const GAME_CONFIG = {
  MAX_SLOTS: 5,
  START_PATIENCE: 5,
  CRITIC_SPAWN_INDICES: [11, 21, 30, 38, 45, 51, 56, 60],
  HEAT_MECHANIC: {
    INCREMENT: 2,
    DECAY: 1,
    MAX: 5,
  }
};

// 0-based Index mapping for 5-letter words.
// Each index has its own distribution of letters.
export const SLOT_DISTRIBUTIONS = [
  // Slot 0 (Column 1)
  {
    A: 141, B: 173, C: 198, D: 111, E: 72, F: 136, G: 115, H: 69, I: 34, J: 20,
    K: 20, L: 88, M: 107, N: 37, O: 41, P: 142, Q: 23, R: 105, S: 366, T: 149,
    U: 33, V: 43, W: 83, X: 0, Y: 6, Z: 3
  },
  // Slot 1 (Column 2)
  {
    A: 304, B: 17, C: 40, D: 20, E: 242, F: 8, G: 11, H: 144, I: 202, J: 2,
    K: 10, L: 201, M: 38, N: 121, O: 279, P: 61, Q: 15, R: 267, S: 16, T: 77,
    U: 186, V: 15, W: 44, X: 14, Y: 23, Z: 2
  },
  // Slot 2 (Column 3)
  {
    A: 307, B: 57, C: 56, D: 75, E: 177, F: 25, G: 67, H: 9, I: 266, J: 3,
    K: 12, L: 112, M: 61, N: 139, O: 244, P: 58, Q: 1, R: 163, S: 80, T: 111,
    U: 165, V: 49, W: 26, X: 12, Y: 29, Z: 11
  },
  // Slot 3 (Column 4)
  {
    A: 163, B: 24, C: 152, D: 69, E: 318, F: 35, G: 76, H: 28, I: 170, J: 2,
    K: 55, L: 162, M: 68, N: 182, O: 132, P: 50, Q: 0, R: 152, S: 171, T: 139,
    U: 82, V: 46, W: 25, X: 3, Y: 3, Z: 20
  },
  // Slot 4 (Column 5)
  {
    A: 64, B: 11, C: 31, D: 118, E: 424, F: 26, G: 41, H: 137, I: 18, J: 0,
    K: 113, L: 156, M: 42, N: 130, O: 58, P: 56, Q: 0, R: 212, S: 36, T: 253,
    U: 6, V: 0, W: 17, X: 8, Y: 364, Z: 4
  }
];
