import {
  GAME_CONFIG,
  SLOT_DISTRIBUTIONS,
} from "./config.js";
import { Dictionary } from "./dictionary.js";
import { negativeReviews, criticWords } from "./loader.js";

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

    // Check for Critic Constraint
    const critic = state.activeSlots.find(c => c.type === 'critic');
    let letter = this.drawValidTile(state, slotIndex);

    // If there is a critic, ensure the drawn tile at slotIndex does NOT match critic's secret word at slotIndex
    // This avoids accidental "clues" from normal customers? Or just avoiding conflict?
    // User didn't ask for this, but it was in previous logic. I'll keep it safe.
    if (critic) {
        let attempts = 0;
        while (letter === critic.secretWord[slotIndex] && attempts < 10) {
             // Put back in correct bag ONLY if it came from the bag
             // If we are in fallback mode (bag empty), we don't push back
             if (state.tileBags[slotIndex] && state.tileBags[slotIndex].length > 0) {
                 state.tileBags[slotIndex].push(letter);
                 this.shuffle(state.tileBags[slotIndex]);
             }
            letter = this.drawValidTile(state, slotIndex);
            attempts++;
        }
    }

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

  spawnCriticOrCustomer(state) {
    const usedIndices = state.activeSlots.map((c) => c.constraint.index);
    const broken = state.brokenSlots || [];
    const allIndices = [0, 1, 2, 3, 4];
    const availableIndices = allIndices.filter((i) => !usedIndices.includes(i) && !broken.includes(i));

    while (
      state.activeSlots.length < state.maxSlots &&
      availableIndices.length > 0
    ) {
      const slotIndex = availableIndices.shift();

      // Determine what to spawn based on state.customerSpawnCount
      // The count represents how many have spawned BEFORE this one.
      // So the "next" one is customerSpawnCount + 1.
      const nextSpawnNumber = state.customerSpawnCount + 1;

      const activeCritic = state.activeSlots.find(c => c.type === 'critic');
      let spawnCritic = false;

      // Check if this spawn index is a Critic Spawn
      if (!activeCritic) {
          if (GAME_CONFIG.CRITIC_SPAWN_INDICES.includes(nextSpawnNumber)) {
              spawnCritic = true;
          } else if (nextSpawnNumber > 60 && (nextSpawnNumber - 60) % 4 === 0) {
              spawnCritic = true;
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
          });
          state.customerSpawnCount++;
      } else {
          const customer = this.generateCustomer(state, slotIndex);
          if (customer) {
            state.activeSlots.push(customer);
            state.customerSpawnCount++;
          }
      }
    }
  },

  calculatePrediction(state, currentBuffer) {
    // No prediction logic needed without economy
    return {};
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

    state.customersSatisfied += standardMatches.length;

    // Remove defeated critic
    if (criticDefeated) {
        state.activeSlots = state.activeSlots.filter(c => c.type !== 'critic');
        state.customersSatisfied += 1;
    }

    const endTurnResult = this.endTurn(state);

    state.buffer = "";
    return {
        success: true,
        matches: standardMatches,
        happyDepartedIds: standardMatches,
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

    this.spawnCriticOrCustomer(state);
    state.turnCount++;

    return { unhappyDepartedIds };
  },
};
