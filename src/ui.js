import { InputHandler } from './input.js';
import { Dictionary } from './dictionary.js';
import { GameLogic } from './logic.js';

let previousCustomerIds = new Set();
let previousActiveIndices = new Set([0, 1, 2, 3, 4]);

export const ui = {
    getCustomersContainer: () => document.getElementById('customers-container'),
    getInputContainer: () => document.getElementById('input-container'),
    getTurnDisplay: () => document.getElementById('turn-display'),

    // Helper for gradient colors
    getWatchColor(index, total) {
        // Index 0 = Red (Last Standing)
        // Index Max = Cyan (First to go)
        // We want a gradient from Red -> Cyan
        if (total <= 1) return 'text-red-500';

        const ratio = index / (total - 1); // 0.0 to 1.0

        // Simple discrete mapping based on ratio
        if (ratio < 0.25) return 'text-red-500';
        if (ratio < 0.50) return 'text-fuchsia-500'; // Magenta-ish
        if (ratio < 0.75) return 'text-purple-500';
        if (ratio < 1.0) return 'text-blue-500';
        return 'text-cyan-500';
    },

    injectStyles() {
        if (!document.getElementById('dynamic-animations')) {
            const style = document.createElement('style');
            style.id = 'dynamic-animations';
            style.textContent = `
                @keyframes slideInFromLeft { from { transform: translateX(-100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                @keyframes slideInFromRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                @keyframes slideOutRight { from { transform: translateX(0); opacity: 1; } to { transform: translateX(120%); opacity: 0; } }
                @keyframes slideOutLeft { from { transform: translateX(0); opacity: 1; } to { transform: translateX(-120%); opacity: 0; } }
                @keyframes blinkRedBorder { 0%, 100% { border-color: inherit; } 50% { border-color: #ef4444; box-shadow: 0 0 0 2px #ef4444; } }
                .animate-slide-in { animation: slideInFromLeft 0.5s ease-out forwards; }
                .animate-slide-in-right { animation: slideInFromRight 0.5s ease-out forwards; }
                .animate-slide-out-right { animation: slideOutRight 0.5s ease-in forwards; }
                .animate-slide-out-left { animation: slideOutLeft 0.5s ease-in forwards; }
                .animate-blink-red { animation: blinkRedBorder 1s infinite; }
            `;
            document.head.appendChild(style);
        }
    },

    renderCustomers(state) {
        this.injectStyles(); // Ensure animations exist
        const container = this.getCustomersContainer();
        container.innerHTML = '';
        const customers = state.activeSlots;

        // Toast Message Handling
        if (state.toastMessage) {
            let toast = document.getElementById('toast-message');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'toast-message';
                // Tailwind classes for Toast
                toast.className = 'fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded shadow-lg z-50 transition-opacity duration-500 opacity-0';
                document.body.appendChild(toast);
            }
            toast.textContent = state.toastMessage;
            // Trigger animation via class
            requestAnimationFrame(() => {
                toast.classList.remove('opacity-0');
                toast.classList.add('opacity-100');
            });

            setTimeout(() => {
                toast.classList.remove('opacity-100');
                toast.classList.add('opacity-0');
                if (state.toastMessage === toast.textContent) {
                    state.toastMessage = null;
                }
            }, 3000);
            state.toastMessage = null;
        }

        const currentActiveIndices = new Set();

        for (let i = 0; i < 5; i++) {
            const customer = customers.find(c => c.constraint.index === i);

            if (customer) {
                currentActiveIndices.add(i);
                const isCritic = customer.type === 'critic';

                // Main Card Container - Grid Layout
                // [Avatar] [Slots] [Stats]
                // Stats column fixed width to align hearts/prices
                const card = document.createElement('div');
                card.className = `relative bg-white border border-slate-200 rounded-lg shadow-sm p-2 grid grid-cols-[auto_1fr_100px] gap-3 items-center h-16 ${isCritic ? 'border-l-4 border-l-indigo-500 bg-indigo-50/50' : ''}`;
                card.dataset.id = customer.id;

                if (!previousCustomerIds.has(customer.id)) {
                    card.classList.add('animate-slide-in');
                }

                // 1. Avatar
                const img = document.createElement('img');
                img.src = `https://api.dicebear.com/9.x/personas/svg?seed=${customer.seed}`;
                img.alt = 'Portrait';
                img.className = `w-12 h-12 rounded-full border border-slate-300 ${isCritic ? 'grayscale contrast-125' : ''}`;
                card.appendChild(img);

                // 2. Slots Row (Center)
                const slotRow = document.createElement('div');
                slotRow.className = 'flex gap-1 justify-center items-center';

                // Logic for Critic Clues
                let discoveredLetters = new Set();
                if (isCritic) {
                    const sessionGuessString = customer.sessionGuesses.join("");
                    for (const char of customer.secretWord) {
                        if (sessionGuessString.includes(char)) {
                            discoveredLetters.add(char);
                        }
                    }
                }

                for (let j = 0; j < 5; j++) {
                    const slot = document.createElement('div');
                    // Tailwind slot styling
                    slot.className = 'w-8 h-8 flex items-center justify-center border border-slate-300 rounded bg-white relative font-mono text-lg font-bold text-slate-800';

                    if (isCritic) {
                        const secretChar = customer.secretWord[j];
                        let isSolved = false;
                        for (const guess of customer.sessionGuesses) {
                            if (guess[j] === secretChar) {
                                isSolved = true;
                                break;
                            }
                        }

                        if (isSolved) {
                            slot.textContent = secretChar;
                            slot.classList.add('bg-green-100', 'border-green-500', 'text-green-800');
                        } else {
                            // Pencil Grid 2x2
                            const grid = document.createElement('div');
                            grid.className = 'absolute inset-0 grid grid-cols-2 grid-rows-2 gap-0.5 p-0.5 pointer-events-none';

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
                            potentialMarks.sort();

                            // Limit to 4 for 2x2 grid (per user instruction to ignore overflow)
                            potentialMarks.slice(0, 4).forEach(markChar => {
                                const mark = document.createElement('span');
                                // "A bit larger" -> text-[10px] or text-xs (0.75rem=12px might be too big for 2x2 in 32px box)
                                // 32px / 2 = 16px per cell. 10px font fits.
                                mark.className = 'flex items-center justify-center text-[10px] leading-none text-yellow-600 font-bold';
                                mark.textContent = markChar;
                                grid.appendChild(mark);
                            });
                            slot.appendChild(grid);
                        }
                    } else {
                        // Standard Customer
                        if (j === customer.constraint.index) {
                            slot.textContent = customer.constraint.letter;
                            slot.classList.add('bg-slate-50', 'border-slate-400');
                        }
                    }
                    slotRow.appendChild(slot);
                }
                card.appendChild(slotRow);

                // 3. Stats (Right)
                const info = document.createElement('div');
                info.className = 'flex flex-col items-end justify-center min-w-[80px]';

                // Price (Removed)

                // Patience (Watches)
                const patienceRow = document.createElement('div');
                patienceRow.className = 'flex gap-0.5 mt-1';

                // Render N watches
                for(let k=0; k < customer.patience; k++) {
                    const icon = document.createElement('i');
                    icon.dataset.lucide = 'watch';
                    // Size 16px
                    const colorClass = this.getWatchColor(k, customer.patience);
                    icon.className = `w-4 h-4 ${colorClass}`;
                    patienceRow.appendChild(icon);
                }
                info.appendChild(patienceRow);
                card.appendChild(info);

                container.appendChild(card);
            } else {
                // Review Card
                const reviewCard = document.createElement('div');
                reviewCard.className = 'h-16 flex items-center justify-center bg-red-50 border border-red-200 rounded-lg text-red-700 font-bold text-sm';

                if (previousActiveIndices.has(i)) {
                    reviewCard.classList.add('animate-slide-in-right');
                }
                const reviewText = state.deadSlotReviews[i] || "Walked Out";
                reviewCard.textContent = `★☆☆☆☆ - ${reviewText}`;
                container.appendChild(reviewCard);
            }
        }

        previousCustomerIds = new Set(customers.map(c => c.id));
        previousActiveIndices = currentActiveIndices;
    },

    renderHUD(state) {
        const scoreDisplay = document.getElementById('score-display');
        if (scoreDisplay) scoreDisplay.textContent = state.customersSatisfied;
    },

    renderKeyboard(state) {
        try {
            let keyboard = document.getElementById('keyboard');
            const inputContainer = this.getInputContainer();

            if (!keyboard) {
                keyboard = document.createElement('div');
                keyboard.id = 'keyboard';
                keyboard.className = 'w-full flex flex-col gap-1.5 items-center mt-2';
                inputContainer.appendChild(keyboard);
            }

            keyboard.innerHTML = '';

            // Buffer Display
            let bufferDisplay = document.getElementById('buffer-display');
            if (!bufferDisplay) {
                bufferDisplay = document.createElement('div');
                bufferDisplay.id = 'buffer-display';
                bufferDisplay.className = 'flex justify-center mb-4';
                inputContainer.insertBefore(bufferDisplay, keyboard);
            }

            const isFull = state.buffer.length === 5;
            const isValid = isFull && Dictionary.isValid(state.buffer);
            const isInvalid = isFull && !isValid;

            bufferDisplay.innerHTML = '';
            const bufferRow = document.createElement('div');
            bufferRow.className = 'flex gap-1.5';

            for(let i=0; i<5; i++) {
                 const slot = document.createElement('div');
                 // Buffer slot styling
                 let slotClass = 'w-10 h-10 border-2 rounded flex items-center justify-center text-xl font-bold font-mono transition-colors';
                 if (state.buffer[i]) {
                     slotClass += ' bg-white border-slate-800 text-slate-800';
                 } else {
                     slotClass += ' bg-slate-50 border-slate-200 text-transparent';
                 }

                 if (isInvalid) {
                     slotClass += ' !text-slate-400 !border-slate-300 line-through bg-slate-100';
                 }

                 slot.className = slotClass;
                 slot.textContent = state.buffer[i] || "";
                 bufferRow.appendChild(slot);
            }
            bufferDisplay.appendChild(bufferRow);

            // Stats Row (Removed)
            const oldStatsRow = document.getElementById('stats-row');
            if (oldStatsRow) oldStatsRow.remove();

            // Calculate Buffer Counts for Warning
            const bufferCounts = {};
            for (const char of state.buffer) {
                bufferCounts[char] = (bufferCounts[char] || 0) + 1;
            }

            // Keyboard Logic
            const critic = state.activeSlots.find(c => c.type === 'critic');
            const deadLetters = new Set();
            const discoveredLetters = new Set(); // Candidates (Yellow)

            if (critic) {
                const secret = critic.secretWord;
                const sessionGuessesStr = critic.sessionGuesses.join("");

                // Identify Dead Letters (Tried & Absent)
                critic.sessionGuesses.forEach(guess => {
                    for (const char of guess) {
                        if (!secret.includes(char)) {
                            deadLetters.add(char);
                        }
                    }
                });

                // Identify Discovered/Candidate Letters (Present in Secret & Found)
                for (const char of secret) {
                    if (sessionGuessesStr.includes(char)) {
                        discoveredLetters.add(char);
                    }
                }
            }

            const rows = [
                "QWERTYUIOP",
                "ASDFGHJKL",
                "ZXCVBNM"
            ];

            rows.forEach((rowString, index) => {
                const rowDiv = document.createElement('div');
                rowDiv.className = 'flex gap-1 w-full justify-center';

                if (index === 2) {
                    const backBtn = document.createElement('button');
                    backBtn.className = 'flex-grow-[1.5] h-12 bg-slate-200 hover:bg-slate-300 rounded text-slate-700 font-bold flex items-center justify-center max-w-[60px] active:scale-95 transition-transform';
                    backBtn.innerHTML = '<i data-lucide="delete" class="w-5 h-5"></i>'; // Lucide Backspace? 'delete' or 'arrow-left'? 'delete' is usually backspace-like.
                    // Actually Lucide 'delete' is an X in a shield/pentagon. 'backspace' doesn't exist? 'delete' works. 'move-left' maybe?
                    // Let's use text '⌫' if icon uncertain, or check docs. Lucide has 'delete'.
                    // I'll stick to text '⌫' for safety or use icon if I can.
                    // User said "Use lucide.dev for icons".
                    // Lucide 'delete' is standard. Or 'arrow-left-circle'.
                    // Let's use text for consistency with previous unless I find 'delete' is good.
                    // Actually I'll use Lucide.
                    backBtn.onclick = () => InputHandler.handleVirtualKey('BACKSPACE');
                    rowDiv.appendChild(backBtn);
                }

                for (let char of rowString) {
                    const keyBtn = document.createElement('button');
                    const heat = state.keyHeat ? state.keyHeat[char] : 0;

                    let baseClass = 'flex-1 h-12 rounded flex flex-col items-center justify-center select-none max-w-[40px] border transition-all duration-200';
                    let bgClass = 'bg-slate-100 border-slate-200';
                    let textClass = 'text-slate-700 font-bold';
                    let interactClass = 'cursor-pointer active:scale-95 hover:brightness-95';

                    // Warning Logic
                    // If heat + buffer usage >= 4, and not already exploded
                    const usageInBuffer = bufferCounts[char] || 0;
                    if (heat < 4 && (heat + usageInBuffer) >= 4) {
                        baseClass += ' animate-blink-red';
                    }

                    // 1. Heat State (Backgrounds)
                    if (heat === 1) {
                         bgClass = 'bg-orange-100 border-orange-200';
                    } else if (heat === 2) {
                         bgClass = 'bg-orange-300 border-orange-400';
                    } else if (heat === 3) {
                         bgClass = 'bg-red-500 border-red-600';
                         textClass = 'text-white font-bold';
                    } else if (heat >= 4) {
                         bgClass = 'bg-slate-800 border-slate-900';
                         textClass = 'text-slate-500 font-normal line-through';
                         interactClass = 'cursor-not-allowed opacity-80';
                    }

                    // 2. Critic Feedback (Text Overrides) - Only if not exploded
                    if (heat < 4) {
                        if (deadLetters.has(char)) {
                             // Red Text (Absent)
                             // If BG is Red (Heat 3), change to Black for contrast
                             if (heat === 3) textClass = 'text-slate-900 font-extrabold';
                             else textClass = 'text-red-600 font-extrabold';
                        } else if (discoveredLetters.has(char)) {
                             // Yellow Text (Present)
                             if (heat === 3) textClass = 'text-yellow-300 font-extrabold';
                             else textClass = 'text-yellow-700 font-extrabold'; // Darker yellow for orange/slate bg
                        }
                    }

                    keyBtn.className = `${baseClass} ${bgClass} ${textClass} ${interactClass}`;

                    const charSpan = document.createElement('div');
                    charSpan.className = 'text-sm leading-none';
                    charSpan.textContent = char;

                    keyBtn.appendChild(charSpan);

                    if (heat < 4) {
                        keyBtn.onclick = () => InputHandler.handleVirtualKey(char);
                    }

                    rowDiv.appendChild(keyBtn);
                }

                if (index === 2) {
                    const enterBtn = document.createElement('button');
                    enterBtn.className = 'flex-grow-[1.5] h-12 bg-slate-200 hover:bg-slate-300 rounded text-slate-700 font-bold flex items-center justify-center max-w-[60px] active:scale-95 transition-transform';
                    enterBtn.innerHTML = '<i data-lucide="corner-down-left" class="w-5 h-5"></i>'; // Enter icon
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
            debugBtn.className = 'fixed bottom-2 left-2 z-50 text-xs px-2 py-1 rounded opacity-70 hover:opacity-100 transition-opacity text-white font-bold';
            document.body.appendChild(debugBtn);

            debugBtn.onclick = () => {
                state.debugMode = !state.debugMode;
                this.render(state);
                debugBtn.blur();
            };
        }

        debugBtn.textContent = state.debugMode ? 'Debug: ON' : 'Debug: OFF';
        debugBtn.classList.remove('bg-green-500', 'bg-red-500');
        debugBtn.classList.add(state.debugMode ? 'bg-green-500' : 'bg-red-500');
    },

    animateExits(happyIds, unhappyIds) {
        const container = this.getCustomersContainer();
        if (!container) return Promise.resolve();

        const cards = Array.from(container.querySelectorAll('[data-id]')); // Select by data-id
        const animations = [];

        cards.forEach(card => {
            const id = card.dataset.id;
            if (happyIds.includes(id)) {
                card.classList.add('animate-slide-out-right');
                animations.push(new Promise(resolve => {
                    card.addEventListener('animationend', resolve, { once: true });
                    setTimeout(resolve, 600);
                }));
            } else if (unhappyIds.includes(id)) {
                card.classList.add('animate-slide-out-left');
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

        // Initialize Lucide Icons
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }
};
