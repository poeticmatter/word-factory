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

            // Target Letter (Large, bold)
            const targetLetter = document.createElement('div');
            targetLetter.className = 'target-letter';
            targetLetter.textContent = customer.constraint.letter;

            // Constraint Text
            const constraintText = document.createElement('div');
            constraintText.className = 'constraint-text';
            constraintText.textContent = `Slot ${customer.constraint.index + 1}`; // Display as 1-based index for user friendliness? Prompt said "e.g., 'Slot 3'". Usually 1-based in UI.

            // Price
            const price = document.createElement('div');
            price.className = 'price';
            price.textContent = `$${customer.willingPrice.toFixed(2)}`;

            // Patience
            const patience = document.createElement('div');
            patience.className = 'patience';
            // Render 5 dots or hearts. Let's use dots for now, filled vs empty?
            // "Render 5 dots or hearts". If patience is 5, 5 filled?
            // Assuming max patience is 5 (START_PATIENCE).
            let patienceHtml = '';
            for (let i = 0; i < 5; i++) {
                if (i < customer.patience) {
                    patienceHtml += '<span class="dot filled">●</span>';
                } else {
                    patienceHtml += '<span class="dot empty">○</span>';
                }
            }
            patience.innerHTML = patienceHtml;

            info.appendChild(targetLetter);
            info.appendChild(constraintText);
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
