import { GAME_CONFIG } from './config.js';

export const GameLogic = {
    generateCustomer(state) {
        if (state.activeSlots.length >= state.maxSlots) {
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
        while (state.activeSlots.length < state.maxSlots) {
            const customer = this.generateCustomer(state);
            if (customer) {
                state.activeSlots.push(customer);
            } else {
                break;
            }
        }
    },

    processTurn(state) {
        if (state.buffer.length !== 5) {
            return { success: false, message: "Word must be 5 letters" };
        }

        // Calculate Cost
        let cost = 0;
        for (let char of state.buffer) {
            cost += state.letterCosts[char];
        }

        // Solvency Check
        if (cost > state.cash) {
            return { success: false, message: "Too Expensive" };
        }

        // Identify Matches
        const matches = [];
        let revenue = 0;

        state.activeSlots.forEach(customer => {
            const charAtConstraint = state.buffer[customer.constraint.index];
            if (charAtConstraint === customer.constraint.letter) {
                matches.push(customer.id);
                revenue += customer.willingPrice;
            }
        });

        // Execute Transaction
        state.cash = state.cash - cost + revenue;

        // Inflation: Increase cost of every used letter
        const usedLetters = new Set(state.buffer.split(''));
        for (let char of state.buffer) {
            state.letterCosts[char] += GAME_CONFIG.INFLATION_RATE;
        }

        // Remove matched customers
        state.activeSlots = state.activeSlots.filter(c => !matches.includes(c.id));

        // End Turn
        this.endTurn(state, usedLetters);

        // Clear buffer after turn
        state.buffer = "";

        return { success: true, matches: matches };
    },

    skipTurn(state) {
        this.endTurn(state, new Set()); // No letters used
        state.buffer = ""; // Clear buffer on skip?
    },

    endTurn(state, usedLettersSet = new Set()) {
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        for (let char of alphabet) {
            if (!usedLettersSet.has(char)) {
                state.letterCosts[char] = Math.max(GAME_CONFIG.MIN_LETTER_COST, state.letterCosts[char] - GAME_CONFIG.DEFLATION_RATE);
            }
        }

        // Decay
        state.activeSlots.forEach(c => {
            c.patience -= 1;
            c.willingPrice = parseFloat((c.willingPrice - GAME_CONFIG.PRICE_DECAY).toFixed(2));
        });

        // Departure
        const originalCount = state.activeSlots.length;
        state.activeSlots = state.activeSlots.filter(c => c.patience > 0);
        const departedCount = originalCount - state.activeSlots.length;
        state.maxSlots = Math.max(0, state.maxSlots - departedCount); // Prevent negative slots

        // Spawn
        this.initializeGame(state);

        state.turnCount++;
    }
};
