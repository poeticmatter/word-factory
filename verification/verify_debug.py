from playwright.sync_api import sync_playwright

def verify_debug_mode():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the game
        page.goto("http://localhost:8080")

        # Wait for initialization (dictionary load etc)
        page.wait_for_timeout(2000)

        # Close Help Modal if present
        close_btn = page.locator(".close-btn")
        if close_btn.is_visible():
            close_btn.click()
            page.wait_for_timeout(500)

        # 1. Verify Debug Button Exists
        debug_btn = page.locator("#debug-toggle")
        if not debug_btn.is_visible():
            print("Debug button not found!")
            browser.close()
            return

        print("Debug button found.")

        # 2. Toggle Debug Mode ON
        debug_btn.click()
        page.wait_for_timeout(500)

        # Take screenshot of Debug ON
        page.screenshot(path="verification/debug_mode_on.png")
        print("Screenshot taken: debug_mode_on.png")

        # 3. Type Invalid Word "ABCDE"
        # We need to simulate typing. The game listens to document keydown.
        page.keyboard.type("ABCDE")
        page.wait_for_timeout(500)

        # Take screenshot of buffer
        page.screenshot(path="verification/buffer_filled.png")

        # 4. Submit
        page.keyboard.press("Enter")
        page.wait_for_timeout(1000)

        # Take screenshot of result (buffer should be empty if accepted)
        page.screenshot(path="verification/after_submit.png")
        print("Screenshot taken: after_submit.png")

        browser.close()

if __name__ == "__main__":
    verify_debug_mode()
