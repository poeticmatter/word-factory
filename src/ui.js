import { InputHandler } from './input.js';

export const ui = {
    getCustomersContainer: () => document.getElementById('customers-container'),
    getInputContainer: () => document.getElementById('input-container'),
    getCashDisplay: () => document.getElementById('cash-display'),
    getTurnDisplay: () => document.getElementById('turn-display'),

    renderCustomers(customers) {
        const container = this.getCustomersContainer();
        container.innerHTML = '';

        customers.forEach(customer => {
            const card = document.createElement('div');
            card.className = 'customer-card';

            const img = document.createElement('img');
            img.src = `https://api.dicebear.com/9.x/personas/svg?seed=${customer.seed}`;
            img.alt = 'Customer Portrait';
            card.appendChild(img);

            const slotRow = document.createElement('div');
            slotRow.className = 'slot-row';

            for (let i = 0; i < 5; i++) {
                const slot = document.createElement('div');
                slot.className = 'letter-slot';
                if (i === customer.constraint.index) {
                    slot.textContent = customer.constraint.letter;
                    slot.classList.add('slot-active');
                }
                slotRow.appendChild(slot);
            }
            card.appendChild(slotRow);

            const info = document.createElement('div');
            info.className = 'customer-info';

            const price = document.createElement('div');
            price.className = 'price';
            price.textContent = `$${customer.willingPrice.toFixed(2)}`;

            const patience = document.createElement('div');
            patience.className = 'patience-text';
            patience.textContent = `Patience: ${customer.patience}`;

            info.appendChild(price);
            info.appendChild(patience);

            card.appendChild(info);

            container.appendChild(card);
        });
    },

    renderHUD(state) {
        const cashDisplay = this.getCashDisplay();
        const turnDisplay = this.getTurnDisplay();

        if (cashDisplay) cashDisplay.textContent = state.cash.toFixed(2);
        if (turnDisplay) turnDisplay.textContent = state.turnCount;
    },

    renderKeyboard(state) {
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

        // Render 5 slots for buffer
        bufferDisplay.innerHTML = '';
        const bufferRow = document.createElement('div');
        bufferRow.className = 'slot-row';
        for(let i=0; i<5; i++) {
             const slot = document.createElement('div');
             slot.className = 'letter-slot';
             slot.textContent = state.buffer[i] || "";
             if (state.buffer[i]) slot.classList.add('slot-filled');
             bufferRow.appendChild(slot);
        }
        bufferDisplay.appendChild(bufferRow);


        const rows = [
            "QWERTYUIOP",
            "ASDFGHJKL",
            "ZXCVBNM"
        ];

        rows.forEach(rowString => {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'keyboard-row';

            for (let char of rowString) {
                const keyBtn = document.createElement('div');
                keyBtn.className = 'key';

                const cost = state.letterCosts[char];

                if (cost <= 1.00) keyBtn.classList.add('key-cheap');
                else if (cost > 1.00 && cost < 3.00) keyBtn.classList.add('key-mid');
                else if (cost >= 3.00) keyBtn.classList.add('key-expensive');

                const charSpan = document.createElement('div');
                charSpan.className = 'key-char';
                charSpan.textContent = char;

                const priceSpan = document.createElement('div');
                priceSpan.className = 'key-price';
                priceSpan.textContent = `$${cost.toFixed(2)}`;

                keyBtn.appendChild(charSpan);
                keyBtn.appendChild(priceSpan);

                keyBtn.onclick = () => InputHandler.handleVirtualKey(char);

                rowDiv.appendChild(keyBtn);
            }
            keyboard.appendChild(rowDiv);
        });

        // Add special keys (Backspace, Enter, Space) visual?
        // Prompt only asked for "Show the Letter and Current Price".
        // But InputHandler supports them.
    },

    render(state) {
        this.renderHUD(state);
        this.renderCustomers(state.activeSlots);
        this.renderKeyboard(state);
    }
};
