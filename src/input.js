import { GameLogic } from './logic.js';
import { ui } from './ui.js';
import { state } from './state.js';

export const InputHandler = {
    handleVirtualKey(char) {
        if (state.buffer.length < 5) {
            state.buffer += char;
            ui.render(state);
        }
    },

    handlePhysicalKey(event) {
        // Prevent default behavior for game keys if needed, but usually fine
        const key = event.key.toUpperCase();

        if (key === 'ENTER') {
            GameLogic.processTurn(state);
            ui.render(state);
            return;
        }

        if (key === ' ') {
            event.preventDefault(); // Prevent scrolling
            GameLogic.skipTurn(state);
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
