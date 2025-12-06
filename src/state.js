import { GAME_CONFIG } from './config.js';

export const state = {
    cash: 0,
    turnCount: 0,
    activeSlots: [],
    letterCosts: {},

    init() {
        this.cash = GAME_CONFIG.START_CASH;
        this.turnCount = 0; // Assuming starting turn is 0 or 1. Let's start with 0 or 1? "Initialize the state with the values from config". Config doesn't specify start turn. 1 is safe.
        this.activeSlots = []; // Max slots is in config, but active slots starts empty? Or filled? "Initialize...". Usually empty or waiting for logic. I'll leave it empty for now.

        // Initialize letterCosts (A-Z) all at 1.00
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        for (let char of alphabet) {
            this.letterCosts[char] = 1.00;
        }
    }
};
