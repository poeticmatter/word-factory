import {
  GAME_CONFIG,
  SCRABBLE_DISTRIBUTION,
  INVALID_POSITIONS,
} from "./config.js";
import { Dictionary } from "./dictionary.js";
import { negativeReviews } from "./loader.js";

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
      if (
        INVALID_POSITIONS[slotIndex] &&
        INVALID_POSITIONS[slotIndex].includes(tile)
      ) {
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

    let letter = this.drawValidTile(state, slotIndex);

    const index = slotIndex; // Fixed position based on slot

    const willingPrice = GAME_CONFIG.BASE_REWARD;

    // Generate a random seed
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
      willingPrice: parseFloat(willingPrice.toFixed(2)),
      patience: basePatience,
    };
  },

  initializeGame(state) {
    const usedIndices = state.activeSlots.map((c) => c.constraint.index);
    const allIndices = [0, 1, 2, 3, 4]; // Assumes MAX_SLOTS is 5
    const availableIndices = allIndices.filter((i) => !usedIndices.includes(i));

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

    // Sort activeSlots by constraint index to keep UI stable (0,1,2,4 etc.)
    state.activeSlots.sort((a, b) => a.constraint.index - b.constraint.index);
  },

  spawnCriticOrCustomer(state) {
    const usedIndices = state.activeSlots.map((c) => c.constraint.index);
    const allIndices = [0, 1, 2, 3, 4];
    const availableIndices = allIndices.filter((i) => !usedIndices.includes(i));

    while (
      state.activeSlots.length < state.maxSlots &&
      availableIndices.length > 0
    ) {
      const slotIndex = availableIndices.shift();

      const activeCritic = state.activeSlots.find(c => c.type === 'critic');
      let spawnCritic = false;

      // Check totalCash against CRITIC_THRESHOLDS
      // Constraint: Only spawn if no Critic is currently active.
      if (!activeCritic) {
           if (typeof state.nextCriticThresholdIndex === 'undefined') {
               state.nextCriticThresholdIndex = 0;
           }

           if (state.nextCriticThresholdIndex < GAME_CONFIG.CRITIC_THRESHOLDS.length) {
               const threshold = GAME_CONFIG.CRITIC_THRESHOLDS[state.nextCriticThresholdIndex];
               if (state.totalLifetimeCash >= threshold) {
                   spawnCritic = true;
                   state.nextCriticThresholdIndex++;
               }
           }
      }

      if (spawnCritic) {
          const secretWord = Dictionary.getRandomWord();
          const seed = "CRITIC" + Date.now();

          state.activeSlots.push({
              type: 'critic',
              id: seed,
              seed: seed,
              secretWord: secretWord,
              sessionGuesses: [], // "The Critic entity must track its own isolated state: sessionGuesses"
              patience: GAME_CONFIG.CRITIC_PATIENCE, // Starts at 6 (Double normal)
              constraint: { index: slotIndex }, // Still need a visual slot
              willingPrice: 0,
          });
      } else {
          const customer = this.generateCustomer(state, slotIndex);
          if (customer) {
            state.activeSlots.push(customer);
          }
      }
    }
  },

  calculatePrediction(state, currentBuffer) {
    let cost = 0;
    for (let char of currentBuffer) {
      cost += state.letterCosts[char] || 0;
    }

    let income = 0;
    state.activeSlots.forEach((customer) => {
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

    state.activeSlots.forEach((customer) => {
      const charAtConstraint = state.buffer[customer.constraint.index];
      if (charAtConstraint === customer.constraint.letter) {
        matches.push(customer.id);
        revenue += customer.willingPrice;
      }
    });

    // Execute Transaction
    state.cash = state.cash - cost + revenue;
    state.totalLifetimeCash += revenue; // Track lifetime earnings

    // Inflation: Increase cost of every used letter
    const usedLetters = new Set(state.buffer.split(""));
    for (let char of state.buffer) {
      state.letterCosts[char] *= GAME_CONFIG.INFLATION_RATE;
    }

    // Handle Critic Logic if active
    const critic = state.activeSlots.find(c => c.type === 'critic');
    let criticDefeated = false;

    if (critic) {
        // "When the player submits a valid word to the game (any customer), push that word to the Critic's sessionGuesses."
        critic.sessionGuesses.push(state.buffer);

        // Win Condition: Exact Match
        // "Win: If the player submits the exact secretWord, the Critic leaves."
        if (state.buffer === critic.secretWord) {
             criticDefeated = true;
             // Reward: "Increase global max patience for future customers by +1."
             state.globalPatienceBonus = (state.globalPatienceBonus || 0) + 1;
             // Reset Keyboard Hints related to Critic?
             // "Keyboard Feedback... Do not use Yellow/Green on the keyboard; keep the keyboard for "Dead Letters" only"
             // Since we share keyboard state, maybe we should clear "absent" hints that are not dead letters for other reasons?
             // But actually, dead letters are just dead.
             // We can probably keep the red keys or reset them.
             // Prompt says: "If Critic patience hits 0 ... show a toast message".
             // For win, it doesn't say reset keyboard, but it's good practice.
             state.keyboardHints = {};
        } else {
             // Keyboard Feedback
             // "Iterate through sessionGuesses. If a letter has been tried and is NOT in the secretWord at all, turn that key Bold Red."
             const secret = critic.secretWord;

             // We need to re-evaluate keyboard hints based on ALL session guesses
             // Because previous "absent" might still be valid or we need to ensure we only mark dead letters.
             // Actually, keyboardHints is global state.
             // We should update it.

             // Clear existing hints first?
             // Or merge?
             // The prompt says "keep the keyboard for 'Dead Letters' only".
             // This implies we shouldn't show green/yellow on keyboard.

             // Let's iterate all session guesses to determine dead letters.
             critic.sessionGuesses.forEach(guess => {
                 for (let char of guess) {
                     if (!secret.includes(char)) {
                         state.keyboardHints[char] = 'absent';
                     }
                 }
             });
        }
    }

    // Remove matched customers
    state.activeSlots = state.activeSlots.filter(
      (c) => !matches.includes(c.id)
    );

    if (criticDefeated) {
        state.activeSlots = state.activeSlots.filter(c => c.type !== 'critic');
    }

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
        state.letterCosts[char] = Math.max(
          GAME_CONFIG.MIN_LETTER_COST,
          state.letterCosts[char] * GAME_CONFIG.DEFLATION_RATE
        );
      }
    }

    // Decay
    state.activeSlots.forEach((c) => {
      c.patience -= 1;
      c.willingPrice = parseFloat(
        (c.willingPrice - GAME_CONFIG.PRICE_DECAY).toFixed(2)
      );
    });

    // Departure
    const originalCount = state.activeSlots.length;
    let criticLostSecret = null;

    // Check if any departing are Critics -> Penalty
    const departingCritics = state.activeSlots.filter(c => c.patience <= 0 && c.type === 'critic');
    if (departingCritics.length > 0) {
        // "Loss: If Critic patience hits 0, they leave. Penalty: Permanently destroy the seat slot. Show a toast message: 'They wanted: [SECRET WORD]'."
        criticLostSecret = departingCritics[0].secretWord;
        // Reset keyboard hints if critic leaves
        state.keyboardHints = {};
    }

    state.activeSlots = state.activeSlots.filter((c) => c.patience > 0);
    const departedCount = originalCount - state.activeSlots.length;

    const oldMaxSlots = state.maxSlots;
    state.maxSlots = Math.max(0, state.maxSlots - departedCount);

    // Assign reviews for newly dead slots
    if (state.maxSlots < oldMaxSlots) {
        for (let i = state.maxSlots; i < oldMaxSlots; i++) {
            if (criticLostSecret && i === state.maxSlots) { // Crude way to attach message to the specific slot if possible, or just toast.
                // The prompt says "Show a toast message".
                // We'll handle the toast in UI or here by setting a property.
                // But we also need to set deadSlotReview.
                state.deadSlotReviews[i] = `Wanted: ${criticLostSecret}`;
            } else if (negativeReviews.length > 0) {
                const randomReview = negativeReviews[Math.floor(Math.random() * negativeReviews.length)];
                state.deadSlotReviews[i] = randomReview;
            } else {
                 state.deadSlotReviews[i] = "Walked Out";
            }
        }
    }

    // If there was a critic loss, we can also dispatch an event or set a flag for the UI to show a toast.
    if (criticLostSecret) {
        // We can't easily show a toast from here without UI access, but we can store it in state.
        state.toastMessage = `They wanted: ${criticLostSecret}`;
    }

    // Spawn Logic
    this.spawnCriticOrCustomer(state);

    state.turnCount++;
  },
};
