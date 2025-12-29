from playwright.sync_api import sync_playwright

def debug_ids(page):
    print("Navigating...")
    page.goto("http://localhost:8080")
    print("Waiting for customers...")
    page.wait_for_selector(".customer-card")

    # Evaluate JS to get IDs
    ids = page.evaluate("""() => {
        const cards = Array.from(document.querySelectorAll('.customer-card'));
        return cards.map(c => ({
            id: c.dataset.id,
            classList: c.className,
            html: c.outerHTML.substring(0, 100) // First 100 chars
        }));
    }""")

    print("Customer Cards found:", len(ids))
    for i, card in enumerate(ids):
        print(f"Card {i}: ID='{card['id']}' Class='{card['classList']}'")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        debug_ids(page)
        browser.close()
