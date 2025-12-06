import { GAME_CONFIG, SCRABBLE_DISTRIBUTION, INVALID_POSITIONS } from './config.js';
import { Dictionary } from './dictionary.js';

export const GameLogic = {
    fillTileBag(state) {
        state.tileBag = [];
        for (const [char, count] of Object.entries(SCRABBLE_DISTRIBUTION)) {
            for (let i = 0; i < count; i++) {
                state.tileBag.push(char);
            }
        }

        this.shuffle(state.tileBag);
    },

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    },

    drawTile(state) {
        if (!state.tileBag || state.tileBag.length === 0) {
            this.fillTileBag(state);
        }
        return state.tileBag.pop();
    },

    drawValidTile(state, slotIndex) {
        let heldTiles = [];

        while (true) {
            const tile = this.drawTile(state);

            // Check validity
            // Check if INVALID_POSITIONS has an entry for this slotIndex
            if (INVALID_POSITIONS[slotIndex] && INVALID_POSITIONS[slotIndex].includes(tile)) {
                heldTiles.push(tile);
                continue;
            }

            // If we are here, the tile is valid
            // Put back held tiles
            if (heldTiles.length > 0) {
                state.tileBag.push(...heldTiles);
                this.shuffle(state.tileBag);
            }

            return tile;
        }
    },

    generateCustomer(state, slotIndex) {
        if (state.activeSlots.length >= state.maxSlots) {
            return null;
        }

        const letter = this.drawValidTile(state, slotIndex);
        const index = slotIndex; // Fixed position based on slot

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
        const usedIndices = state.activeSlots.map(c => c.constraint.index);
        const allIndices = [0, 1, 2, 3, 4]; // Assumes MAX_SLOTS is 5
        const availableIndices = allIndices.filter(i => !usedIndices.includes(i));

        while (state.activeSlots.length < state.maxSlots && availableIndices.length > 0) {
            const slotIndex = availableIndices.shift();
            const customer = this.generateCustomer(state, slotIndex);
            if (customer) {
                state.activeSlots.push(customer);
            }
        }

        // Sort activeSlots by constraint index to keep UI stable (0,1,2,4 etc.)
        state.activeSlots.sort((a, b) => a.constraint.index - b.constraint.index);
    },

    calculatePrediction(state, currentBuffer) {
        let cost = 0;
        for (let char of currentBuffer) {
            cost += state.letterCosts[char] || 0;
        }

        let income = 0;
        state.activeSlots.forEach(customer => {
            // Check if buffer is long enough to cover the index
            if (currentBuffer.length > customer.constraint.index) {
                const charAtConstraint = currentBuffer[customer.constraint.index];
                if (charAtConstraint === customer.constraint.letter) {
                    income += customer.willingPrice;
                }
            }
        });

        return { cost, income, profit: income - cost };
    },

    processTurn(state) {
        if (state.buffer.length !== 5) {
            return { success: false, message: "Word must be 5 letters" };
        }

        // Dictionary Check
        if (!Dictionary.isValid(state.buffer)) {
            return { success: false, message: "Unknown Word" };
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
        state.buffer = "";
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
        state.maxSlots = Math.max(0, state.maxSlots - departedCount);

        // Spawn
        this.initializeGame(state);

        state.turnCount++;
    }
};
