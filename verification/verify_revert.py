from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("http://localhost:8080/index.html")

    # Wait for game to load
    page.wait_for_selector(".customer-card")

    # Close help modal if open
    if page.is_visible("#help-modal"):
        page.click("#start-btn")

    # Take screenshot
    page.screenshot(path="verification/revert_screenshot.png")

    # Check for absence of critic elements (just in case they were somehow still there)
    critic_exists = page.locator(".critic-card").count() > 0
    print(f"Critic elements found: {critic_exists}")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
