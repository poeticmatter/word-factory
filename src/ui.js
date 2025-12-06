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

            // Portrait
            const portrait = document.createElement('div');
            portrait.className = 'portrait';
            const img = document.createElement('img');
            img.src = `https://api.dicebear.com/9.x/personas/svg?seed=${customer.seed}`;
            img.alt = 'Customer Portrait';
            portrait.appendChild(img);

            // Info
            const info = document.createElement('div');
            info.className = 'customer-info';

            // Constraint Row (Replaces old Target Letter + Constraint Text)
            // The requirement says: "Display the word constraint as a row of 5 square tiles (boxes)"
            // It seems we might want to remove the separate large "Target Letter" and "Constraint Text"
            // and replace them with this row, or keep the Target Letter?
            // "Goal: Update the Customer UI to display the word constraint as a row of 5 square tiles (boxes), rather than text underscores."
            // "In renderCustomers, modify how the Constraint is generated:"
            // The previous code had `targetLetter` and `constraintText`.
            // The prompt says "If i === customer.constraint.index: Set the innerText to customer.constraint.char"
            // So the letter is now inside the box.

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

            // Price
            const price = document.createElement('div');
            price.className = 'price';
            price.textContent = `$${customer.willingPrice.toFixed(2)}`;

            // Patience
            const patience = document.createElement('div');
            patience.className = 'patience';

            let patienceHtml = '';
            for (let i = 0; i < 5; i++) {
                if (i < customer.patience) {
                    patienceHtml += '<span class="dot filled">●</span>';
                } else {
                    patienceHtml += '<span class="dot empty">○</span>';
                }
            }
            patience.innerHTML = patienceHtml;

            info.appendChild(slotRow);
            info.appendChild(price);
            info.appendChild(patience);

            card.appendChild(portrait);
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

    render(state) {
        this.renderHUD(state);
        this.renderCustomers(state.activeSlots);
    }
};
