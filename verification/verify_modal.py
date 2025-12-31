from playwright.sync_api import sync_playwright

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:8000")

        # Wait for the modal to be visible
        page.wait_for_selector("#help-modal")

        # Take a screenshot of the modal
        page.screenshot(path="verification/modal_verification.png")
        browser.close()

if __name__ == "__main__":
    verify_frontend()
