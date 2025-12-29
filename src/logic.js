import {
  GAME_CONFIG,
  SCRABBLE_DISTRIBUTION,
  INVALID_POSITIONS,
} from "./config.js";
import { Dictionary } from "./dictionary.js";
import { negativeReviews, criticWords } from "./loader.js";

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

    // Check for Critic Constraint
    const critic = state.activeSlots.find(c => c.type === 'critic');
    let letter = this.drawValidTile(state, slotIndex);

    // If there is a critic, ensure the drawn tile at slotIndex does NOT match critic's secret word at slotIndex
    // This avoids accidental "clues" from normal customers? Or just avoiding conflict?
    // User didn't ask for this, but it was in previous logic. I'll keep it safe.
    if (critic) {
        let attempts = 0;
        while (letter === critic.secretWord[slotIndex] && attempts < 10) {
            state.tileBag.push(letter);
            this.shuffle(state.tileBag);
            letter = this.drawValidTile(state, slotIndex);
            attempts++;
        }
    }

    const index = slotIndex;
    const willingPrice = GAME_CONFIG.BASE_REWARD;
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
    const allIndices = [0, 1, 2, 3, 4];
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

      // Check thresholds
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
          // Select from criticWords if available, else fallback (though loader ensures it shouldn't fail)
          const secretWord = criticWords.length > 0
              ? criticWords[Math.floor(Math.random() * criticWords.length)]
              : Dictionary.getRandomWord();

          const seed = "CRITIC" + Date.now();

          state.activeSlots.push({
              type: 'critic',
              id: seed,
              seed: seed,
              secretWord: secretWord,
              sessionGuesses: [],
              patience: 6, // Starts at 6 (Double normal, roughly)
              constraint: { index: slotIndex }, // Needs a slot to sit in
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

    if (!state.debugMode && !Dictionary.isValid(state.buffer)) {
      return { success: false, message: "Unknown Word" };
    }

    // Cost
    let cost = 0;
    for (let char of state.buffer) {
      cost += state.letterCosts[char];
    }

    if (cost > state.cash) {
      return { success: false, message: "Too Expensive" };
    }

    const matches = [];
    let revenue = 0;

    state.activeSlots.forEach((customer) => {
      // Logic for standard customers
      const charAtConstraint = state.buffer[customer.constraint.index];
      if (charAtConstraint === customer.constraint.letter) {
        matches.push(customer.id);
        revenue += customer.willingPrice;
      }
    });

    state.cash = state.cash - cost + revenue;
    state.totalLifetimeCash += revenue;

    // Inflation
    const usedLetters = new Set(state.buffer.split(""));
    for (let char of state.buffer) {
      state.letterCosts[char] *= GAME_CONFIG.INFLATION_RATE;
    }

    // Critic Logic
    const critic = state.activeSlots.find(c => c.type === 'critic');
    let criticDefeated = false;

    if (critic) {
        // Amnesia Logic: Push word to sessionGuesses (Validation already passed)
        critic.sessionGuesses.push(state.buffer);

        // Win Condition
        if (state.buffer === critic.secretWord) {
             criticDefeated = true;
             state.globalPatienceBonus = (state.globalPatienceBonus || 0) + 1;
        }
    }

    // Filter matches to exclude Critic from standard removal
    // (Critics are only removed if defeated or patience runs out)
    const standardMatches = matches.filter(id => {
        const c = state.activeSlots.find(slot => slot.id === id);
        return c && c.type !== 'critic';
    });

    // Remove matched standard customers
    state.activeSlots = state.activeSlots.filter(
      (c) => !standardMatches.includes(c.id)
    );

    // Remove defeated critic
    if (criticDefeated) {
        state.activeSlots = state.activeSlots.filter(c => c.type !== 'critic');
    }

    const endTurnResult = this.endTurn(state, usedLetters);

    state.buffer = "";
    return {
        success: true,
        matches: standardMatches,
        happyDepartedIds: standardMatches,
        unhappyDepartedIds: endTurnResult.unhappyDepartedIds
    };
  },

  skipTurn(state) {
    const endTurnResult = this.endTurn(state, new Set());
    state.buffer = "";
    return {
        success: true,
        happyDepartedIds: [],
        unhappyDepartedIds: endTurnResult.unhappyDepartedIds
    };
  },

  endTurn(state, usedLettersSet = new Set()) {
    // Deflation
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

    // Departure Logic
    const originalCount = state.activeSlots.length;

    // Identify unhappy departures (patience <= 0)
    // Note: includes Critics if they run out of patience
    const unhappyDepartures = state.activeSlots.filter(c => c.patience <= 0);
    const unhappyDepartedIds = unhappyDepartures.map(c => c.id);

    // Check for departing Critics (Loss Condition)
    const departingCritics = unhappyDepartures.filter(c => c.type === 'critic');

    departingCritics.forEach(critic => {
        // Toast message for Critic loss
        state.toastMessage = `They wanted: ${critic.secretWord}`;
    });

    // Remove all zero patience slots
    state.activeSlots = state.activeSlots.filter((c) => c.patience > 0);

    // Calculate slots lost
    const departedCount = originalCount - state.activeSlots.length;

    const oldMaxSlots = state.maxSlots;
    // Reduce max slots for every departure (Standard + Critic Penalty)
    state.maxSlots = Math.max(0, state.maxSlots - departedCount);

    // Assign reviews for lost slots
    if (state.maxSlots < oldMaxSlots) {
        for (let i = state.maxSlots; i < oldMaxSlots; i++) {
            if (negativeReviews.length > 0) {
                const randomReview = negativeReviews[Math.floor(Math.random() * negativeReviews.length)];
                state.deadSlotReviews[i] = randomReview;
            } else {
                 state.deadSlotReviews[i] = "Walked Out";
            }
        }
    }

    this.spawnCriticOrCustomer(state);
    state.turnCount++;

    return { unhappyDepartedIds };
  },
};
