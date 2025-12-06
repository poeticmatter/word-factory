const validWords = new Set();

export const Dictionary = {
    async loadDictionary() {
        try {
            const response = await fetch('dictionary.txt');
            if (!response.ok) {
                throw new Error('Failed to load dictionary');
            }
            const text = await response.text();
            const words = text.split('\n');

            validWords.clear();
            for (const rawWord of words) {
                const word = rawWord.trim().toUpperCase();
                if (word.length === 5) {
                    validWords.add(word);
                }
            }
            console.log(`Dictionary loaded: ${validWords.size} words.`);
        } catch (error) {
            console.error("Error loading dictionary:", error);
            // Fallback? Or just fail? Prompt implies critical path.
            // Let's add at least "HELLO" and "WORLD" for testing if fetch fails?
            // But usually we want to see the error.
        }
    },

    isValid(word) {
        return validWords.has(word.toUpperCase());
    }
};
