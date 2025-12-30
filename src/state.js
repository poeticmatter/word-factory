import { GAME_CONFIG } from './config.js';

export const state = {
    cash: 0,
    turnCount: 0,
    activeSlots: [],
    letterCosts: {},
    buffer: "",
    maxSlots: GAME_CONFIG.MAX_SLOTS,
    tileBag: [],
    deadSlotReviews: [],
    totalLifetimeCash: 0,
    globalPatienceBonus: 0,
    keyboardHints: {}, // { char: 'correct' | 'present' | 'absent' }
    toastMessage: null,
    nextCriticThresholdIndex: 0,
    debugMode: false,
    brokenSlots: [],

    init() {
        this.cash = GAME_CONFIG.START_CASH;
        this.turnCount = 0;
        this.activeSlots = [];
        this.buffer = "";
        this.maxSlots = GAME_CONFIG.MAX_SLOTS;
        this.brokenSlots = [];
        this.tileBag = [];
        this.deadSlotReviews = [];
        this.totalLifetimeCash = 0;
        this.globalPatienceBonus = 0;
        this.keyboardHints = {};
        this.toastMessage = null;
        this.nextCriticThresholdIndex = 0;
        this.debugMode = false;

        // Initialize letterCosts (A-Z) all at 1.00
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        for (let char of alphabet) {
            this.letterCosts[char] = 1.00;
        }
    }
};
