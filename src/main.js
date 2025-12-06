import { GAME_CONFIG } from './config.js';
import { state } from './state.js';
import { ui } from './ui.js';
import { GameLogic } from './logic.js';

console.log("Game System Initialized");

// Initialize the game state
state.init();

// Game Logic Initialization
GameLogic.initializeGame(state);

// Initial Render
ui.render(state);

// Log to verify everything is loaded correctly
console.log("Configuration:", GAME_CONFIG);
console.log("Initial State:", state);
