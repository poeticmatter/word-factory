import { GAME_CONFIG } from './config.js';

export const GameLogic = {
    generateCustomer(state) {
        if (state.activeSlots.length >= GAME_CONFIG.MAX_SLOTS) {
            return null;
        }

        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const letter = alphabet[Math.floor(Math.random() * alphabet.length)];
        const index = Math.floor(Math.random() * 5); // 0-4

        const currentLetterCost = state.letterCosts[letter];
        const willingPrice = GAME_CONFIG.BASE_REWARD + currentLetterCost;

        // Generate a random seed
        const seed = Date.now().toString() + Math.random().toString();
        const id = seed;

        return {
            id: id,
            seed: seed,
            constraint: {
                letter: letter,
                index: index
            },
            willingPrice: parseFloat(willingPrice.toFixed(2)),
            patience: GAME_CONFIG.START_PATIENCE
        };
    },

    initializeGame(state) {
        while (state.activeSlots.length < GAME_CONFIG.MAX_SLOTS) {
            const customer = this.generateCustomer(state);
            if (customer) {
                state.activeSlots.push(customer);
            } else {
                break; // Should not happen if check is correct, but safety break
            }
        }
    }
};
