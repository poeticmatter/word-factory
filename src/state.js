import { GAME_CONFIG } from "./config.js";

export const state = {
  turnCount: 0,
  customerSpawnCount: 0,
  customersSatisfied: 0,
  activeSlots: [],
  buffer: "",
  maxSlots: GAME_CONFIG.MAX_SLOTS,
  tileBags: [],
  deadSlotReviews: [],
  keyboardHints: {}, // { char: 'correct' | 'present' | 'absent' }
  toastMessage: null,
  nextCriticThresholdIndex: 0,
  debugMode: false,
  brokenSlots: [],

  init() {
    this.turnCount = 0;
    this.customerSpawnCount = 0;
    this.customersSatisfied = 0;
    this.activeSlots = [];
    this.buffer = "";
    this.maxSlots = GAME_CONFIG.MAX_SLOTS;
    this.brokenSlots = [];
    this.tileBags = [[], [], [], [], []];
    this.deadSlotReviews = [];
    this.keyboardHints = {};
    this.toastMessage = null;
    this.nextCriticThresholdIndex = 0;
    this.debugMode = false;
  },
};
