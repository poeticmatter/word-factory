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

            // 1. Avatar (Image) - Direct child as per CSS structure inference
            const img = document.createElement('img');
            img.src = `https://api.dicebear.com/9.x/personas/svg?seed=${customer.seed}`;
            img.alt = 'Customer Portrait';
            card.appendChild(img);

            // 2. The Word Slots (The row of boxes)
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

            // 3. Info Container (Price and Patience Text)
            // Grouped in .customer-info as implied by CSS
            const info = document.createElement('div');
            info.className = 'customer-info';

            // Price
            const price = document.createElement('div');
            price.className = 'price';
            price.textContent = `$${customer.willingPrice.toFixed(2)}`;

            // Patience Text
            const patience = document.createElement('div');
            patience.className = 'patience-text'; // New class or just use text
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

    render(state) {
        this.renderHUD(state);
        this.renderCustomers(state.activeSlots);
    }
};
