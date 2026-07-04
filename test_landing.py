from playwright.sync_api import sync_playwright
import time

errors = []
warnings = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})

    def on_console(msg):
        if msg.type == "error":
            errors.append(msg.text)
        elif msg.type == "warning":
            warnings.append(msg.text)
    page.on("console", on_console)
    page.on("pageerror", lambda exc: errors.append(f"PAGEERROR: {exc}"))

    page.goto("http://localhost:3000/", wait_until="networkidle")
    time.sleep(1)

    page.screenshot(path="C:/Users/TUMMA/OneDrive/Desktop/open code projects/virtual assisant/shot_full.png", full_page=True)

    # Hero
    page.locator("section").first.screenshot(path="C:/Users/TUMMA/OneDrive/Desktop/open code projects/virtual assisant/shot_hero.png")

    # Click tabs
    for label in ["Leads", "Conversations", "Analytics"]:
        try:
            page.get_by_text(label, exact=True).first.click()
            time.sleep(0.5)
            page.screenshot(path=f"C:/Users/TUMMA/OneDrive/Desktop/open code projects/virtual assisant/shot_tab_{label}.png")
        except Exception as e:
            errors.append(f"Tab click failed for {label}: {e}")

    # Scroll to stats bar
    page.mouse.wheel(0, 900)
    time.sleep(1.5)
    page.screenshot(path="C:/Users/TUMMA/OneDrive/Desktop/open code projects/virtual assisant/shot_stats.png")

    # Scroll to comparison
    page.mouse.wheel(0, 600)
    time.sleep(1)
    page.screenshot(path="C:/Users/TUMMA/OneDrive/Desktop/open code projects/virtual assisant/shot_comparison.png")

    # Scroll through rest of page in chunks, checking for jank/errors
    for i in range(10):
        page.mouse.wheel(0, 700)
        time.sleep(0.3)

    page.screenshot(path="C:/Users/TUMMA/OneDrive/Desktop/open code projects/virtual assisant/shot_bottom.png", full_page=False)

    browser.close()

print("ERRORS:", errors)
print("WARNINGS:", warnings[:20])
