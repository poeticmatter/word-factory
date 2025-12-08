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

    // Check for Critic Constraint
    // "Do not generate new customer requests that match the Critic's secret word's positions"
    const critic = state.activeSlots.find(c => c.type === 'critic');
    let letter = this.drawValidTile(state, slotIndex);

    // If there is a critic, ensure the drawn tile at slotIndex does NOT match critic's secret word at slotIndex
    if (critic) {
        let attempts = 0;
        while (letter === critic.secretWord[slotIndex] && attempts < 10) {
            state.tileBag.push(letter);
            this.shuffle(state.tileBag);
            letter = this.drawValidTile(state, slotIndex);
            attempts++;
        }
    }

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
              guesses: [],
              patience: GAME_CONFIG.START_PATIENCE + (state.globalPatienceBonus || 0),
              constraint: { index: slotIndex },
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

  getCriticStatus(critic) {
    // Step A: Find Greens (Confirmed)
    const slots = Array(5).fill(null).map(() => ({ status: 'unsolved', letter: null, pencilMarks: [] }));

    // Check all guesses for Greens
    if (critic.guesses) {
        critic.guesses.forEach(guess => {
            for (let i = 0; i < 5; i++) {
                if (guess[i] === critic.secretWord[i]) {
                    slots[i].status = 'solved';
                    slots[i].letter = guess[i];
                }
            }
        });
    }

    // Step B: Find Yellows (Candidates)
    const secretCounts = {};
    for (let char of critic.secretWord) {
        secretCounts[char] = (secretCounts[char] || 0) + 1;
    }

    // Decrement for solved slots
    for (let i = 0; i < 5; i++) {
        if (slots[i].status === 'solved') {
            const char = slots[i].letter;
            if (secretCounts[char] > 0) {
                secretCounts[char]--;
            }
        }
    }

    // Determine Candidates
    const candidates = [];
    for (const [char, count] of Object.entries(secretCounts)) {
        if (count > 0) {
            candidates.push(char);
        }
    }

    // Step C: Calculate Pencil Marks
    for (let i = 0; i < 5; i++) {
        if (slots[i].status === 'unsolved') {
            // For every Candidate L
            candidates.forEach(L => {
                // Check History: Has player guessed L at position i?
                let triedAtPos = false;
                if (critic.guesses) {
                    for (let guess of critic.guesses) {
                        if (guess[i] === L) {
                            triedAtPos = true;
                            break;
                        }
                    }
                }

                if (!triedAtPos) {
                     if (!slots[i].pencilMarks.includes(L)) {
                         slots[i].pencilMarks.push(L);
                     }
                }
            });
        }
    }

    return slots;
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
        // Win Condition: Exact Match
        if (state.buffer === critic.secretWord) {
             criticDefeated = true;
             // Reward
             state.globalPatienceBonus = (state.globalPatienceBonus || 0) + 1;
             // Reset Keyboard
             state.keyboardHints = {};
        } else {
             // Push to history
             if (!critic.guesses) critic.guesses = [];
             critic.guesses.push(state.buffer);

             // Update Keyboard Hints
             const word = state.buffer;
             const secret = critic.secretWord;

             // First pass: Correct letters (Green)
             const secretArr = secret.split('');
             const wordArr = word.split('');
             const unmatchedSecret = [];

             for (let i=0; i<5; i++) {
                 if (wordArr[i] === secretArr[i]) {
                     state.keyboardHints[wordArr[i]] = 'correct';
                     secretArr[i] = null; // Mark handled
                 } else {
                     unmatchedSecret.push(secretArr[i]);
                 }
             }

             // Second pass: Present (Yellow) or Absent (Red)
             for (let i=0; i<5; i++) {
                 const char = wordArr[i];
                 if (state.keyboardHints[char] === 'correct') continue; // Already green

                 if (unmatchedSecret.includes(char)) {
                      if (state.keyboardHints[char] !== 'correct') {
                           state.keyboardHints[char] = 'present';
                      }
                      const idx = unmatchedSecret.indexOf(char);
                      if (idx > -1) unmatchedSecret.splice(idx, 1);
                 } else {
                      if (!state.keyboardHints[char]) {
                          state.keyboardHints[char] = 'absent';
                      }
                 }
             }
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

    // Check if any departing are Critics -> Penalty
    const departingCritics = state.activeSlots.filter(c => c.patience <= 0 && c.type === 'critic');
    if (departingCritics.length > 0) {
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
            if (negativeReviews.length > 0) {
                const randomReview = negativeReviews[Math.floor(Math.random() * negativeReviews.length)];
                state.deadSlotReviews[i] = randomReview;
            } else {
                 state.deadSlotReviews[i] = "Walked Out";
            }
        }
    }

    // Spawn Logic
    this.spawnCriticOrCustomer(state);

    state.turnCount++;
  },
};
