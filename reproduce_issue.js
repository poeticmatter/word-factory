
// Mock console
const console = {
    log: () => {},
    error: () => {}
};

// Mock dependencies
const state = {
    activeSlots: [],
    letterCosts: {},
    buffer: "GUESS" // Valid 5-letter word
};

// Test Setup
const secretWord = "scowl"; // Lowercase from critic.txt
const guess = "SCOWL"; // Uppercase from Input

const critic = {
    type: 'critic',
    secretWord: secretWord,
    sessionGuesses: [guess]
};

state.activeSlots.push(critic);

// Replicate logic from ui.js
const deadLetters = new Set();
const secret = critic.secretWord;

critic.sessionGuesses.forEach(g => {
    for (const char of g) {
        if (!secret.includes(char)) {
            deadLetters.add(char);
        }
    }
});

// Output
if (deadLetters.size > 0) {
    if (deadLetters.has('S') || deadLetters.has('C') || deadLetters.has('O') || deadLetters.has('W') || deadLetters.has('L')) {
        // Since "SCOWL" matches "scowl" in meaning, we expect NO dead letters if case-insensitive.
        // But if case-sensitive, 'S' (upper) is not in 'scowl' (lower), so it will be dead.
        process.stdout.write("FAILURE: Letters marked as dead despite being correct (Case Mismatch confirmed).\n");
        process.stdout.write(`Dead Letters: ${Array.from(deadLetters).join(', ')}\n`);
    } else {
        process.stdout.write("SUCCESS: Logic handles case correctly.\n");
    }
} else {
    process.stdout.write("SUCCESS: No dead letters found.\n");
}
