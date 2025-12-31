from playwright.sync_api import sync_playwright

def verify_score_hud():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:8000")

        # Close the modal if it's open (click the 'Got it!' button)
        try:
            page.wait_for_selector("#start-btn", timeout=2000)
            page.click("#start-btn")
            print("Closed help modal.")
        except:
            print("Help modal not found or already closed.")

        # Wait for the HUD to be visible
        try:
             page.wait_for_selector("#hud")
        except:
             print("HUD not found")
             page.screenshot(path="verification/score_hud_debug.png")
             exit(1)

        # Check if the score display exists
        score_display = page.locator("#score-display")
        try:
            score_display.wait_for(state="visible", timeout=2000)
            text = score_display.inner_text()
            print(f"Found Score Text: '{text}'")

            if text == "0":
                print("Score HUD verified successfully.")
            else:
                print("Score HUD verification failed: Text mismatch.")
        except Exception as e:
            print(f"Score Display not found or visible: {e}")
            page.screenshot(path="verification/score_hud_fail.png")

        # Take a screenshot
        page.screenshot(path="verification/score_hud_verification.png")
        browser.close()

if __name__ == "__main__":
    verify_score_hud()
