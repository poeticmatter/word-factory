import {
  GAME_CONFIG,
  SLOT_DISTRIBUTIONS,
} from "./config.js";
import { Dictionary } from "./dictionary.js";
import { negativeReviews } from "./loader.js";

export const GameLogic = {
  createTileBag(distribution) {
    const bag = [];
    for (const [char, count] of Object.entries(distribution)) {
      for (let i = 0; i < count; i++) {
        bag.push(char);
      }
    }
    this.shuffle(bag);
    return bag;
  },

  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  },

  initGame(state) {
    // Fill the 5 tile bags based on distributions
    state.tileBags = [];
    for (let i = 0; i < 5; i++) {
      state.tileBags[i] = this.createTileBag(SLOT_DISTRIBUTIONS[i]);
    }
  },

  drawValidTile(state, slotIndex) {
    const bag = state.tileBags[slotIndex];
    if (bag && bag.length > 0) {
      return bag.pop();
    }

    // Fallback: Random letter
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    return alphabet[Math.floor(Math.random() * alphabet.length)];
  },

  generateCustomer(state, slotIndex) {
    if (state.activeSlots.length >= state.maxSlots) {
      return null;
    }

    let letter = this.drawValidTile(state, slotIndex);
    const index = slotIndex;
    const seed = Date.now().toString() + Math.random().toString();
    const id = seed;
    const basePatience = GAME_CONFIG.START_PATIENCE + (state.globalPatienceBonus || 0);

    return {
      type: 'customer',
      id: id,
      seed: seed,
      constraint: {
        letter: letter,
        index: index,
      },
      patience: basePatience,
    };
  },

  initializeGame(state) {
    const usedIndices = state.activeSlots.map((c) => c.constraint.index);
    const broken = state.brokenSlots || [];
    const allIndices = [0, 1, 2, 3, 4];
    const availableIndices = allIndices.filter((i) => !usedIndices.includes(i) && !broken.includes(i));

    while (
      state.activeSlots.length < state.maxSlots &&
      availableIndices.length > 0
    ) {
      const slotIndex = availableIndices.shift();
      const customer = this.generateCustomer(state, slotIndex);
      if (customer) {
        state.activeSlots.push(customer);
      }
    }

    state.activeSlots.sort((a, b) => a.constraint.index - b.constraint.index);
  },

  spawnCustomer(state) {
    const usedIndices = state.activeSlots.map((c) => c.constraint.index);
    const broken = state.brokenSlots || [];
    const allIndices = [0, 1, 2, 3, 4];
    const availableIndices = allIndices.filter((i) => !usedIndices.includes(i) && !broken.includes(i));

    while (
      state.activeSlots.length < state.maxSlots &&
      availableIndices.length > 0
    ) {
      const slotIndex = availableIndices.shift();
      const customer = this.generateCustomer(state, slotIndex);
      if (customer) {
        state.activeSlots.push(customer);
        state.customerSpawnCount++;
      }
    }
  },

  calculatePrediction(state, currentBuffer) {
    // No prediction logic needed without economy
    return {};
  },

  updateKeyHeat(state, word) {
    if (!state.keyHeat) return;

    // Count occurrences in the word
    const wordCounts = {};
    for (const char of word) {
        wordCounts[char] = (wordCounts[char] || 0) + 1;
    }

    const { INCREMENT, DECAY, MAX } = GAME_CONFIG.HEAT_MECHANIC;

    // Iterate all letters
    for (let i = 65; i <= 90; i++) {
        const char = String.fromCharCode(i);

        // If already exploded, skip (it stays broken)
        if (state.keyHeat[char] >= MAX) continue;

        if (wordCounts[char]) {
            state.keyHeat[char] += (wordCounts[char] * INCREMENT);
        } else {
            // Decrement unused letters
            state.keyHeat[char] = Math.max(0, state.keyHeat[char] - DECAY);
        }
    }
  },

  processTurn(state) {
    if (state.buffer.length !== 5) {
      return { success: false, message: "Word must be 5 letters" };
    }

    if (!state.debugMode && !Dictionary.isValid(state.buffer)) {
      return { success: false, message: "Unknown Word" };
    }

    const matches = [];

    state.activeSlots.forEach((customer) => {
      // Logic for standard customers
      const charAtConstraint = state.buffer[customer.constraint.index];
      if (charAtConstraint === customer.constraint.letter) {
        matches.push(customer.id);
      }
    });

    // Remove matched customers
    state.activeSlots = state.activeSlots.filter(
      (c) => !matches.includes(c.id)
    );

    state.customersSatisfied += matches.length;

    this.updateKeyHeat(state, state.buffer);

    const endTurnResult = this.endTurn(state);

    state.buffer = "";
    return {
        success: true,
        matches: matches,
        happyDepartedIds: matches,
        unhappyDepartedIds: endTurnResult.unhappyDepartedIds
    };
  },

  skipTurn(state) {
    const endTurnResult = this.endTurn(state);
    state.buffer = "";
    return {
        success: true,
        happyDepartedIds: [],
        unhappyDepartedIds: endTurnResult.unhappyDepartedIds
    };
  },

  endTurn(state) {
    // Decay
    state.activeSlots.forEach((c) => {
      c.patience -= 1;
    });

    // Departure Logic
    // Identify unhappy departures (patience <= 0)
    const unhappyDepartures = state.activeSlots.filter(c => c.patience <= 0);
    const unhappyDepartedIds = unhappyDepartures.map(c => c.id);

    // Handle Broken Slots for unhappy departures
    if (!state.brokenSlots) state.brokenSlots = [];

    unhappyDepartures.forEach(c => {
         const idx = c.constraint.index;
         if (!state.brokenSlots.includes(idx)) {
             state.brokenSlots.push(idx);
             // Assign Review
             let review = "Walked Out";
             if (negativeReviews && negativeReviews.length > 0) {
                 review = negativeReviews[Math.floor(Math.random() * negativeReviews.length)];
             }
             state.deadSlotReviews[idx] = review;
         }
    });

    // Remove all zero patience slots
    state.activeSlots = state.activeSlots.filter((c) => c.patience > 0);

    // Sync maxSlots with brokenSlots
    state.maxSlots = Math.max(0, 5 - state.brokenSlots.length);

    this.spawnCustomer(state);
    state.turnCount++;

    return { unhappyDepartedIds };
  },
};
