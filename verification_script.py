
from playwright.sync_api import sync_playwright
import time
import os

def run_verification():
    os.makedirs("/home/jules/verification", exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_viewport_size({"width": 1280, "height": 720})

        try:
            print("Navigating to http://localhost:8000")
            page.goto("http://localhost:8000")

            # Wait for canvas to be present
            page.wait_for_selector("#background-canvas")
            print("Background canvas found")

            # Wait a bit for animation to start and effects to appear
            time.sleep(2)

            # Move mouse to trigger interaction
            page.mouse.move(640, 360)
            time.sleep(1)
            page.mouse.move(700, 400)
            time.sleep(1)

            screenshot_path = "/home/jules/verification/background_check.png"
            page.screenshot(path=screenshot_path)
            print(f"Screenshot saved to {screenshot_path}")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    run_verification()
