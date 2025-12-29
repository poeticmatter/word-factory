export const negativeReviews = [];
export const criticWords = [];

export async function loadReviews() {
    try {
        const response = await fetch('reviews.txt');
        if (!response.ok) {
            console.error("Failed to load reviews.txt");
            return;
        }
        const text = await response.text();
        // Split by newline and filter empty strings
        const reviews = text.split('\n').map(r => r.trim()).filter(r => r.length > 0);
        negativeReviews.push(...reviews);
        console.log("Reviews loaded:", negativeReviews.length);
    } catch (e) {
        console.error("Error loading reviews:", e);
    }
}

export async function loadCriticWords() {
    const response = await fetch('critic.txt');
    if (!response.ok) {
        throw new Error("Failed to load critic.txt");
    }
    const text = await response.text();
    const words = text.split('\n')
        .map(w => w.trim())
        .filter(w => w.length > 0 && !w.startsWith('#'));

    criticWords.push(...words);
    console.log("Critic words loaded:", criticWords.length);
}
