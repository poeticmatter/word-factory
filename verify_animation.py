from playwright.sync_api import sync_playwright, expect
import time

def verify_customer_departure(page):
    print("Navigating to app...")
    page.goto("http://localhost:8080")

    # Close the help modal if it exists
    print("Closing help modal...")
    try:
        page.click("#start-btn", timeout=2000)
    except:
        print("No start button found or modal already closed.")

    # Wait for customers to load (they slide in)
    print("Waiting for customers...")
    page.wait_for_selector(".customer-card")

    # Wait a bit for initial slide-in animation to finish
    time.sleep(1)

    # Enable Debug Mode
    print("Enabling Debug Mode...")
    page.click("#debug-toggle")

    # Blur the button to avoid Enter key triggering it again
    page.evaluate("document.getElementById('debug-toggle').blur()")

    # Get the text of the first active slot of the first customer
    first_customer_constraint = page.locator(".customer-card").first.locator(".slot-active").inner_text()
    print(f"Target letter: {first_customer_constraint}")

    word_to_type = first_customer_constraint * 5
    print(f"Typing: {word_to_type}")

    for char in word_to_type:
        page.keyboard.press(char)

    # Take screenshot of buffer filled
    page.screenshot(path="/home/jules/verification/step1_buffer.png")

    # Press Enter to submit
    print("Pressing Enter...")
    page.keyboard.press("Enter")

    # Wait a tiny bit for the class to be applied and animation to progress slightly
    # We want to catch it visible
    # time.sleep(0.05)

    # Check if any card has the class 'slide-out-right'
    print("Checking for slide-out-right class...")
    leaving_customer = page.locator(".slide-out-right")

    try:
        expect(leaving_customer.first).to_be_visible()
        print("Success: Found leaving customer with animation class.")
    except:
        print("Failed to find leaving customer immediately.")

    # Take a screenshot during animation
    page.screenshot(path="/home/jules/verification/step2_animation.png")

    # Wait for animation to finish (0.6s)
    time.sleep(0.7)

    # Take final screenshot (customer should be gone)
    page.screenshot(path="/home/jules/verification/step3_gone.png")
    print("Verification complete.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_customer_departure(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="/home/jules/verification/error.png")
        finally:
            browser.close()
