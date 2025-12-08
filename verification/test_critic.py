from playwright.sync_api import sync_playwright, expect
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # 1. Load the game
    page.goto("http://localhost:8000/index.html")

    # Wait for game to init and spawn critic (since threshold is 0)
    # We need to trigger a turn for spawn logic to run?
    # spawnCriticOrCustomer is called in initializeGame?
    # Yes, GameLogic.initializeGame calls generateCustomer.
    # But spawnCriticOrCustomer is called in endTurn.
    # So we might need to play one turn to spawn a critic if initializeGame doesn't call it.
    # initializeGame calls generateCustomer directly, NOT spawnCriticOrCustomer.
    # So initial board has only customers.
    # We need to play one turn to trigger endTurn -> spawnCriticOrCustomer.

    # Close help modal
    page.click("#start-btn")

    # Type a valid word "HELLO"
    page.keyboard.type("HELLO")
    page.click(".key-submit")

    # Wait for animation (departure)
    page.wait_for_timeout(1000)

    # Now a Critic should have spawned.
    # Check for .critic-card
    expect(page.locator(".critic-card")).to_be_visible()

    # Now we need to guess something to populate the critic history and see pencil marks.
    # We don't know the secret word, but we can guess "WORLD".
    # This should leave pencil marks for letters in WORLD that are NOT in the secret word at that pos (wait, no).
    # Pencil marks are Candidates (Yellows).
    # Step B: Identify all unique letters in Secret Word but not solved.
    # Step C: For every Unsolved slot, if Candidate L has NOT been guessed at position i, show pencil mark.

    # Example: Secret is "APPLE". Candidates: A, P, L, E.
    # Guess "WORLD".
    # Slot 0: W. Not A.
    # Slot 1: O. Not P.
    # ...
    # Critic display should show pencil marks for A, P, L, E in slots where we haven't guessed them.
    # Since we guessed W, O, R, L, D.
    # Slot 3 (index 3) is 'L'. We guessed L at index 3.
    # If secret has L at index 3, it would be Green (Solved).
    # If secret has L elsewhere, L is a candidate.
    # If we guessed L at 3, and it wasn't green, then L is NOT at 3.
    # So Pencil Marks at slot 3 should NOT contain L.

    page.keyboard.type("WORLD")
    page.click(".key-submit")

    page.wait_for_timeout(1000)

    # Take screenshot
    page.screenshot(path="verification/critic_display.png")

    browser.close()

if __name__ == "__main__":
    with sync_playwright() as playwright:
        run(playwright)
