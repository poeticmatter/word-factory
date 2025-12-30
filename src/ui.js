import { InputHandler } from './input.js';
import { Dictionary } from './dictionary.js';
import { GameLogic } from './logic.js';

let previousCustomerIds = new Set();
let previousMaxSlots = 5;

export const ui = {
    getCustomersContainer: () => document.getElementById('customers-container'),
    getInputContainer: () => document.getElementById('input-container'),
    getCashDisplay: () => document.getElementById('cash-display'),
    getTurnDisplay: () => document.getElementById('turn-display'),

    renderCustomers(state) {
        const container = this.getCustomersContainer();
        container.innerHTML = '';
        const customers = state.activeSlots;

        // Toast Message Handling
        if (state.toastMessage) {
            let toast = document.getElementById('toast-message');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'toast-message';
                document.body.appendChild(toast);
            }
            toast.textContent = state.toastMessage;
            toast.className = 'toast-show';

            // Auto hide after 3 seconds
            setTimeout(() => {
                toast.className = 'toast-hide';
                // Clear state message
                if (state.toastMessage === toast.textContent) {
                    state.toastMessage = null;
                }
            }, 3000);

            // Clear immediately from state so we don't re-trigger animation on every render
            // But we need to keep it long enough to show?
            // Better pattern: UI checks state, if present, creates toast, then sets state to null.
            state.toastMessage = null;
        }

        // Loop 0 to 4 (Fixed size of 5)
        for (let i = 0; i < 5; i++) {
            // Condition B (The Graveyard)
            if (i >= state.maxSlots) {
                const reviewCard = document.createElement('div');
                reviewCard.className = 'review-card';

                // Animation Check
                if (i < previousMaxSlots) {
                    reviewCard.classList.add('slide-in-right');
                }

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
                card.dataset.id = customer.id;

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

                // CRITIC LOGIC PRE-CALCULATION
                let discoveredLetters = new Set();
                if (isCritic) {
                    // Step B (Find Clues)
                    const sessionGuessString = customer.sessionGuesses.join("");
                    for (const char of customer.secretWord) {
                        if (sessionGuessString.includes(char)) {
                            discoveredLetters.add(char);
                        }
                    }
                }

                for (let j = 0; j < 5; j++) {
                    const slot = document.createElement('div');
                    slot.className = 'letter-slot';

                    if (isCritic) {
                        // CRITIC DISPLAY LOGIC ("Pencil Mark System")
                        const secretChar = customer.secretWord[j];

                        // Check if solved (Step A)
                        let isSolved = false;
                        for (const guess of customer.sessionGuesses) {
                            if (guess[j] === secretChar) {
                                isSolved = true;
                                break;
                            }
                        }

                        if (isSolved) {
                            slot.textContent = secretChar;
                            slot.classList.add('box-locked'); // Green/Locked style
                        } else {
                            // Render Pencil Grid (Step C)
                            // We need a grid container inside the slot
                            const grid = document.createElement('div');
                            grid.className = 'pencil-grid';
                            // Make sure 'letter-slot' has relative positioning in CSS (assumed or needs adding)

                            // Iterate discovered letters to see if we should show pencil mark
                            // Negative Constraint: Check if player has guessed this letter at index j
                            const potentialMarks = [];
                            discoveredLetters.forEach(char => {
                                let alreadyGuessedAtThisPos = false;
                                for (const guess of customer.sessionGuesses) {
                                    if (guess[j] === char) {
                                        alreadyGuessedAtThisPos = true;
                                        break;
                                    }
                                }

                                if (!alreadyGuessedAtThisPos) {
                                    potentialMarks.push(char);
                                }
                            });

                            // Sort for consistent display
                            potentialMarks.sort();

                            // Render marks
                            potentialMarks.forEach(markChar => {
                                const mark = document.createElement('span');
                                mark.className = 'pencil-mark';
                                mark.textContent = markChar;
                                grid.appendChild(mark);
                            });

                            slot.appendChild(grid);

                            // Also show mirror if typing?
                            // Standard UI shows typing in slots... but here the slots are the puzzle.
                            // If player is typing, where does it go?
                            // Usually "buffer" is shown in input area (separate).
                            // The slots on the card are for the Requirement.
                            // So we don't show typing here.
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
        previousMaxSlots = state.maxSlots;
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

            if (!keyboard) {
                keyboard = document.createElement('div');
                keyboard.id = 'keyboard';
                inputContainer.appendChild(keyboard);
            }

            keyboard.innerHTML = '';

            let bufferDisplay = document.getElementById('buffer-display');
            if (!bufferDisplay) {
                bufferDisplay = document.createElement('div');
                bufferDisplay.id = 'buffer-display';
                inputContainer.insertBefore(bufferDisplay, keyboard);
            }

            const isFull = state.buffer.length === 5;
            const isValid = isFull && Dictionary.isValid(state.buffer);
            const isInvalid = isFull && !isValid;

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

            const prediction = GameLogic.calculatePrediction(state, state.buffer);

            let statsRow = document.getElementById('stats-row');
            if (!statsRow) {
                statsRow = document.createElement('div');
                statsRow.id = 'stats-row';
                inputContainer.insertBefore(statsRow, keyboard);
            }
            statsRow.innerHTML = '';

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

            // Determine Keyboard Coloring based on Critic
            // Spec: "If a letter has been tried and is NOT in the secretWord at all, turn that key Bold Red."
            // "Do not use Yellow/Green"
            const critic = state.activeSlots.find(c => c.type === 'critic');
            const deadLetters = new Set();

            if (critic) {
                const secret = critic.secretWord;
                critic.sessionGuesses.forEach(guess => {
                    for (const char of guess) {
                        if (!secret.includes(char)) {
                            deadLetters.add(char);
                        }
                    }
                });
            }

            const rows = [
                "QWERTYUIOP",
                "ASDFGHJKL",
                "ZXCVBNM"
            ];

            rows.forEach((rowString, index) => {
                const rowDiv = document.createElement('div');
                rowDiv.className = 'keyboard-row';

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

                    // Coloring Logic
                    if (deadLetters.has(char)) {
                         keyBtn.classList.add('key-absent'); // Assume 'key-absent' is red/bold-red styled
                    } else {
                        // Standard Price Coloring (only if not dead?)
                        // "Keep the keyboard for 'Dead Letters' only" might mean only show Dead.
                        // But we probably still want to see prices?
                        // Spec: "If a letter has been tried and is NOT in the secretWord at all, turn that key Bold Red."
                        // It doesn't explicitly forbid price colors for others, but says "Do not use Yellow/Green".
                        // Existing logic uses price colors (cheap/mid/expensive).
                        // I will preserve price colors for non-dead letters, as that is core game mechanic (economy).

                        const cost = state.letterCosts[char];
                        if (typeof cost !== 'undefined') {
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

        if (!localStorage.getItem('hasSeenHelp')) {
            openModal();
            localStorage.setItem('hasSeenHelp', 'true');
        }
    },

    renderDebugToggle(state) {
        let debugBtn = document.getElementById('debug-toggle');
        if (!debugBtn) {
            debugBtn = document.createElement('button');
            debugBtn.id = 'debug-toggle';
            debugBtn.style.position = 'fixed';
            debugBtn.style.bottom = '10px';
            debugBtn.style.left = '10px';
            debugBtn.style.zIndex = '9999';
            debugBtn.style.fontSize = '12px';
            debugBtn.style.opacity = '0.7';
            document.body.appendChild(debugBtn);

            debugBtn.onclick = () => {
                state.debugMode = !state.debugMode;
                this.render(state);
                debugBtn.blur();
            };
        }

        debugBtn.textContent = state.debugMode ? 'Debug: ON' : 'Debug: OFF';
        debugBtn.style.backgroundColor = state.debugMode ? '#4CAF50' : '#f44336';
        debugBtn.style.color = 'white';
    },

    animateExits(happyIds, unhappyIds) {
        const container = this.getCustomersContainer();
        if (!container) return Promise.resolve();

        const cards = Array.from(container.querySelectorAll('.customer-card'));
        const animations = [];

        cards.forEach(card => {
            const id = card.dataset.id;
            if (happyIds.includes(id)) {
                card.classList.add('slide-out-right');
                animations.push(new Promise(resolve => {
                    card.addEventListener('animationend', resolve, { once: true });
                    // Fallback in case animation doesn't fire
                    setTimeout(resolve, 600);
                }));
            } else if (unhappyIds.includes(id)) {
                card.classList.add('slide-out-left');
                animations.push(new Promise(resolve => {
                    card.addEventListener('animationend', resolve, { once: true });
                    setTimeout(resolve, 600);
                }));
            }
        });

        if (animations.length > 0) {
            return Promise.all(animations);
        } else {
            return Promise.resolve();
        }
    },

    render(state) {
        this.renderHUD(state);
        this.renderCustomers(state);
        this.renderKeyboard(state);
        this.renderDebugToggle(state);
    }
};
