import { InputHandler } from './input.js';
import { Dictionary } from './dictionary.js';
import { GameLogic } from './logic.js';

let previousCustomerIds = new Set();

// Helper to determine Critic Slot State
function getCriticSlotState(critic, slotIndex) {
    // Step A: Find Solved
    // Loop through sessionGuesses. If a guess has the correct letter in the correct spot.
    for (let guess of critic.sessionGuesses) {
        if (guess[slotIndex] === critic.secretWord[slotIndex]) {
            return {
                status: 'solved',
                letter: critic.secretWord[slotIndex]
            };
        }
    }

    // Step B: Find Clues (Discovered Letters)
    // A letter is discovered ONLY IF it appears in a word inside sessionGuesses AND it exists in the secretWord.
    const discoveredLetters = new Set();
    for (let guess of critic.sessionGuesses) {
        for (let char of guess) {
            if (critic.secretWord.includes(char)) {
                discoveredLetters.add(char);
            }
        }
    }

    // Step C: Draw Pencil Marks
    // For every unsolved slot i (which is here, since we didn't return 'solved')
    const pencilMarks = [];
    discoveredLetters.forEach(char => {
        // Negative Constraint: Check if the player has ever guessed this letter at index i in their sessionGuesses.
        // If they HAVE guessed it there (and it wasn't a match), do NOT show the mark.
        let guessedAtThisSlot = false;
        for (let guess of critic.sessionGuesses) {
            if (guess[slotIndex] === char) {
                guessedAtThisSlot = true;
                break;
            }
        }

        if (!guessedAtThisSlot) {
            pencilMarks.push(char);
        }
    });

    return {
        status: 'unsolved',
        pencilMarks: pencilMarks.sort()
    };
}


export const ui = {
    getCustomersContainer: () => document.getElementById('customers-container'),
    getInputContainer: () => document.getElementById('input-container'),
    getCashDisplay: () => document.getElementById('cash-display'),
    getTurnDisplay: () => document.getElementById('turn-display'),

    renderCustomers(state) {
        const container = this.getCustomersContainer();
        container.innerHTML = '';
        const customers = state.activeSlots;

        // Loop 0 to 4 (Fixed size of 5)
        for (let i = 0; i < 5; i++) {
            // Condition B (The Graveyard)
            if (i >= state.maxSlots) {
                const reviewCard = document.createElement('div');
                reviewCard.className = 'review-card';
                // Retrieve specific review or fallback
                const reviewText = state.deadSlotReviews[i] || "Walked Out";
                reviewCard.textContent = `★☆☆☆☆ - ${reviewText}`;
                container.appendChild(reviewCard);
                continue;
            }

            // Condition A (Active Customer)
            if (i < customers.length) {
                const customer = customers[i];
                const isCritic = customer.type === 'critic';

                const card = document.createElement('div');
                card.className = isCritic ? 'customer-card critic-card' : 'customer-card';

                // Check ID for entry animation
                if (!previousCustomerIds.has(customer.id)) {
                    card.classList.add('slide-in');
                }

                const img = document.createElement('img');
                img.src = `https://api.dicebear.com/9.x/personas/svg?seed=${customer.seed}`;
                img.alt = isCritic ? 'Critic Portrait' : 'Customer Portrait';
                if (isCritic) img.className = 'critic-portrait';
                card.appendChild(img);

                const slotRow = document.createElement('div');
                slotRow.className = 'slot-row';

                for (let j = 0; j < 5; j++) {
                    const slot = document.createElement('div');
                    slot.className = 'letter-slot';

                    if (isCritic) {
                        // CRITIC DISPLAY LOGIC
                        const slotState = getCriticSlotState(customer, j);

                        if (slotState.status === 'solved') {
                             slot.textContent = slotState.letter;
                             slot.classList.add('box-solved');
                        } else {
                            // Pencil Marks
                            if (slotState.pencilMarks.length > 0) {
                                slot.classList.add('pencil-grid');
                                slotState.pencilMarks.forEach(char => {
                                    const mark = document.createElement('div');
                                    mark.className = 'pencil-mark';
                                    mark.textContent = char;
                                    slot.appendChild(mark);
                                });
                            } else if (state.buffer[j]) {
                                // Mirror user input if no pencil marks and unsolved?
                                // Prompt doesn't specify if we still mirror user input for critic.
                                // "Update the Critic's DOM to have 5 slots... Main Letter... Pencil Grid"
                                // Usually in Wordle clones, you see what you type.
                                // But here the typing happens in the buffer area, not in the customer slot.
                                // The customer slot shows the constraint.
                                // For Critic, it shows the known state.
                                // I think it's safer NOT to mirror buffer here, to keep it clean as "Critic State".
                                // The buffer display is separate at the bottom.
                            }
                        }

                    } else {
                        // STANDARD CUSTOMER LOGIC
                        if (j === customer.constraint.index) {
                            slot.textContent = customer.constraint.letter;
                            slot.classList.add('slot-active');
                        }
                    }
                    slotRow.appendChild(slot);
                }
                card.appendChild(slotRow);

                const info = document.createElement('div');
                info.className = 'customer-info';

                if (isCritic) {
                     // Critic Info
                     const label = document.createElement('div');
                     label.className = 'price';
                     label.textContent = "CRITIC";
                     label.style.color = "#3f51b5";
                     info.appendChild(label);
                } else {
                     // Standard Info
                     const price = document.createElement('div');
                     price.className = 'price';
                     price.textContent = `$${customer.willingPrice.toFixed(2)}`;
                     info.appendChild(price);
                }

                const patience = document.createElement('div');
                patience.className = 'patience-hearts';
                patience.textContent = '❤️'.repeat(customer.patience);

                info.appendChild(patience);
                card.appendChild(info);

                container.appendChild(card);
            }
        }

        // Cleanup: Update previousCustomerIds with the current list
        previousCustomerIds = new Set(customers.map(c => c.id));

        // Handle Toast if message exists
        if (state.toastMessage) {
            // Implementation of a simple toast
            let toast = document.getElementById('toast');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'toast';
                document.body.appendChild(toast);
            }
            toast.textContent = state.toastMessage;
            toast.className = 'show-toast';
            setTimeout(() => {
                toast.className = toast.className.replace('show-toast', '');
                state.toastMessage = null; // Clear it
            }, 3000);
        }
    },

    renderHUD(state) {
        const cashDisplay = this.getCashDisplay();
        const turnDisplay = this.getTurnDisplay();

        if (cashDisplay) cashDisplay.textContent = state.cash.toFixed(2);
        if (turnDisplay) turnDisplay.textContent = state.turnCount;
    },

    renderKeyboard(state) {
        try {
            let keyboard = document.getElementById('keyboard');
            const inputContainer = this.getInputContainer();

            // Ensure keyboard container exists inside input-container
            if (!keyboard) {
                keyboard = document.createElement('div');
                keyboard.id = 'keyboard';
                inputContainer.appendChild(keyboard);
            }

            keyboard.innerHTML = ''; // Re-render

            // Display current buffer at the top of input area
            let bufferDisplay = document.getElementById('buffer-display');
            if (!bufferDisplay) {
                bufferDisplay = document.createElement('div');
                bufferDisplay.id = 'buffer-display';
                // Insert buffer display before keyboard
                inputContainer.insertBefore(bufferDisplay, keyboard);
            }

            // Check validity if buffer is full (5 chars)
            const isFull = state.buffer.length === 5;
            const isValid = isFull && Dictionary.isValid(state.buffer);
            const isInvalid = isFull && !isValid;

            // Render 5 slots for buffer
            bufferDisplay.innerHTML = '';
            const bufferRow = document.createElement('div');
            bufferRow.className = 'slot-row';

            if (isInvalid) {
                bufferRow.classList.add('text-invalid');
            } else {
                bufferRow.classList.remove('text-invalid');
            }

            for(let i=0; i<5; i++) {
                 const slot = document.createElement('div');
                 slot.className = 'letter-slot';
                 slot.textContent = state.buffer[i] || "";
                 if (state.buffer[i]) slot.classList.add('slot-filled');
                 bufferRow.appendChild(slot);
            }
            bufferDisplay.appendChild(bufferRow);

            // Stats Row
            // Calculate prediction
            const prediction = GameLogic.calculatePrediction(state, state.buffer);

            // Check if stats row exists, else create it
            let statsRow = document.getElementById('stats-row');
            if (!statsRow) {
                statsRow = document.createElement('div');
                statsRow.id = 'stats-row';
                // Insert after buffer display
                inputContainer.insertBefore(statsRow, keyboard);
            }
            statsRow.innerHTML = ''; // Clear previous

            const costEl = document.createElement('div');
            costEl.className = 'stat-cost';
            costEl.textContent = `Cost: -$${prediction.cost.toFixed(2)}`;

            const incomeEl = document.createElement('div');
            incomeEl.className = 'stat-income';
            incomeEl.textContent = `Income: +$${prediction.income.toFixed(2)}`;

            const profitEl = document.createElement('div');
            if (prediction.profit >= 0) {
                profitEl.className = 'stat-profit-pos';
            } else {
                profitEl.className = 'stat-profit-neg';
            }
            profitEl.textContent = `Profit: $${prediction.profit.toFixed(2)}`;

            statsRow.appendChild(costEl);
            statsRow.appendChild(incomeEl);
            statsRow.appendChild(profitEl);


            const rows = [
                "QWERTYUIOP",
                "ASDFGHJKL",
                "ZXCVBNM"
            ];

            rows.forEach((rowString, index) => {
                const rowDiv = document.createElement('div');
                rowDiv.className = 'keyboard-row';

                // Row 3 (Index 2): Prepend Backspace
                if (index === 2) {
                    const backBtn = document.createElement('div');
                    backBtn.className = 'key key-action';
                    backBtn.textContent = '⌫';
                    backBtn.onclick = () => InputHandler.handleVirtualKey('BACKSPACE');
                    rowDiv.appendChild(backBtn);
                }

                for (let char of rowString) {
                    const keyBtn = document.createElement('div');
                    keyBtn.className = 'key';

                    // Check for Critic Hints (Priority)
                    const hint = state.keyboardHints && state.keyboardHints[char];
                    if (hint === 'absent') {
                        // "Turn that key Bold Red"
                        keyBtn.classList.add('key-absent');
                    } else {
                        // "Do not use Yellow/Green on the keyboard"
                        // So even if hint is correct/present (not used now), we ignore it or handle appropriately if we decide to add it back later.
                        // Currently logic.js only sets 'absent'.

                        // Standard Price Coloring
                        const cost = state.letterCosts[char];
                        // Safety check for cost
                        if (typeof cost === 'undefined') {
                            keyBtn.classList.add('key-mid'); // Fallback style
                        } else {
                            if (cost <= 1.00) keyBtn.classList.add('key-cheap');
                            else if (cost > 1.00 && cost < 3.00) keyBtn.classList.add('key-mid');
                            else if (cost >= 3.00) keyBtn.classList.add('key-expensive');
                        }
                    }

                    const charSpan = document.createElement('div');
                    charSpan.className = 'key-char';
                    charSpan.textContent = char;

                    const priceSpan = document.createElement('div');
                    priceSpan.className = 'key-price';
                    const costVal = state.letterCosts[char];
                    priceSpan.textContent = typeof costVal !== 'undefined' ? `$${costVal.toFixed(2)}` : '???';

                    keyBtn.appendChild(charSpan);
                    keyBtn.appendChild(priceSpan);

                    keyBtn.onclick = () => InputHandler.handleVirtualKey(char);

                    rowDiv.appendChild(keyBtn);
                }

                // Row 3 (Index 2): Append Enter
                if (index === 2) {
                    const enterBtn = document.createElement('div');
                    enterBtn.className = 'key key-submit';
                    enterBtn.textContent = '⏎';
                    enterBtn.onclick = () => InputHandler.handleVirtualKey('ENTER');
                    rowDiv.appendChild(enterBtn);
                }

                keyboard.appendChild(rowDiv);
            });
        } catch(e) {
            console.error("renderKeyboard crash:", e);
        }
    },

    init() {
        const modal = document.getElementById('help-modal');
        const helpBtn = document.getElementById('help-btn');
        const closeBtn = document.querySelector('.close-btn');
        const startBtn = document.getElementById('start-btn');

        function openModal() { modal.classList.remove('hidden'); }
        function closeModal() { modal.classList.add('hidden'); }

        if (helpBtn) helpBtn.onclick = openModal;
        if (closeBtn) closeBtn.onclick = closeModal;
        if (startBtn) startBtn.onclick = closeModal;

        // Auto-Show on First Visit
        if (!localStorage.getItem('hasSeenHelp')) {
            openModal();
            localStorage.setItem('hasSeenHelp', 'true');
        }
    },

    render(state) {
        this.renderHUD(state);
        this.renderCustomers(state);
        this.renderKeyboard(state);
    }
};
