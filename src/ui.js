import { InputHandler } from './input.js';
import { Dictionary } from './dictionary.js';
import { GameLogic } from './logic.js';

let previousCustomerIds = new Set();

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
                // Use a generated seed, but maybe consistent for critic to look distinct?
                // Style.css says .critic-portrait { filter: grayscale(100%) }
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
                        slot.innerHTML = ''; // Clear previous content
                        slot.classList.add('critic-slot');
                        // CRITIC DISPLAY LOGIC
                        const criticStatus = GameLogic.getCriticStatus(customer);
                        const status = criticStatus[j];

                        if (status.status === 'solved') {
                             const mainLetter = document.createElement('div');
                             mainLetter.className = 'main-letter';
                             mainLetter.textContent = status.letter;
                             slot.appendChild(mainLetter);
                        } else {
                             // Unsolved: Show Pencil Grid or Mirror
                             if (state.buffer[j]) {
                                 slot.textContent = state.buffer[j];
                                 slot.classList.add('box-mirror');
                             } else {
                                 const grid = document.createElement('div');
                                 grid.className = 'pencil-grid';

                                 // Sort pencil marks for consistency
                                 status.pencilMarks.sort().forEach(mark => {
                                      const markSpan = document.createElement('div');
                                      markSpan.className = 'pencil-mark';
                                      markSpan.textContent = mark;
                                      grid.appendChild(markSpan);
                                 });
                                 slot.appendChild(grid);
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
                     label.className = 'price'; // Re-use styling or add new
                     label.textContent = "CRITIC";
                     label.style.color = "#3f51b5"; // Match border
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
    },

    renderHUD(state) {
        const cashDisplay = this.getCashDisplay();
        const turnDisplay = this.getTurnDisplay();

        if (cashDisplay) cashDisplay.textContent = state.cash.toFixed(2);
        if (turnDisplay) turnDisplay.textContent = state.turnCount;
    },

    renderKeyboard(state) {
        try {
            console.log("renderKeyboard started");
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
                    if (hint) {
                        if (hint === 'correct') keyBtn.classList.add('key-correct');
                        else if (hint === 'present') keyBtn.classList.add('key-present');
                        else if (hint === 'absent') keyBtn.classList.add('key-absent');
                    } else {
                        // Standard Price Coloring
                        const cost = state.letterCosts[char];
                        // Safety check for cost
                        if (typeof cost === 'undefined') {
                            console.error(`Letter cost for ${char} is undefined!`);
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
            console.log("renderKeyboard finished");
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
