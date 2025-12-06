import { GAME_CONFIG } from './config.js';
import { state } from './state.js';
import { ui } from './ui.js';
import { GameLogic } from './logic.js';
import { InputHandler } from './input.js';
import { Dictionary } from './dictionary.js';
import { loadReviews } from './loader.js';

console.log("Game System Initialized");

// Wrapper for async initialization
async function initApp() {
    console.log("Loading Dictionary...");
    // You could render a loading screen here via UI if desired
    // ui.renderLoading();

    await Dictionary.loadDictionary();
    await loadReviews();

    // Initialize UI listeners (Modal, etc.)
    ui.init();

    // Initialize the game state
    state.init();

    // Game Logic Initialization
    GameLogic.initializeGame(state);

    // Initial Render
    ui.render(state);

    // Attach Event Listeners
    document.addEventListener('keydown', (e) => InputHandler.handlePhysicalKey(e));

    // Log to verify everything is loaded correctly
    console.log("Configuration:", GAME_CONFIG);
    console.log("Initial State:", state);
}

initApp();
