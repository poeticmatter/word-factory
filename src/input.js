import { GameLogic } from './logic.js';
import { ui } from './ui.js';
import { state } from './state.js';

export const InputHandler = {
    async handleVirtualKey(key) {
        if (key === 'BACKSPACE') {
            state.buffer = state.buffer.slice(0, -1);
            ui.render(state);
            return;
        }

        if (key === 'ENTER') {
            const result = GameLogic.processTurn(state);
            if (result.success && (result.happyDepartedIds.length > 0 || result.unhappyDepartedIds.length > 0)) {
                await ui.animateExits(result.happyDepartedIds, result.unhappyDepartedIds);
            }
            ui.render(state);
            if (!result.success && result.message === 'Too Expensive') {
                ui.flashCost();
            }
            return;
        }

        if (state.buffer.length < 5 && key.length === 1) {
            state.buffer += key;
            ui.render(state);
        }
    },

    async handlePhysicalKey(event) {
        // Prevent default behavior for game keys if needed, but usually fine
        const key = event.key.toUpperCase();

        if (key === 'ENTER') {
            const result = GameLogic.processTurn(state);
            if (result.success && (result.happyDepartedIds.length > 0 || result.unhappyDepartedIds.length > 0)) {
                await ui.animateExits(result.happyDepartedIds, result.unhappyDepartedIds);
            }
            ui.render(state);
            if (!result.success && result.message === 'Too Expensive') {
                ui.flashCost();
            }
            return;
        }

        if (key === ' ') {
            event.preventDefault(); // Prevent scrolling
            const result = GameLogic.skipTurn(state);
            if (result.success && (result.happyDepartedIds.length > 0 || result.unhappyDepartedIds.length > 0)) {
                await ui.animateExits(result.happyDepartedIds, result.unhappyDepartedIds);
            }
            ui.render(state);
            return;
        }

        if (key === 'BACKSPACE') {
            state.buffer = state.buffer.slice(0, -1);
            ui.render(state);
            return;
        }

        // Check if it's a letter A-Z
        if (key.length === 1 && key >= 'A' && key <= 'Z') {
            this.handleVirtualKey(key);
        }
    }
};
