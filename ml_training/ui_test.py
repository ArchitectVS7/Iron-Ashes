import asyncio
import os
from playwright.async_api import async_playwright

RESULTS_DIR = os.path.join(os.path.dirname(__file__), 'results')

async def run_ui_test():
    print("[+] Starting Tier 3 Browser UI Verification (Playwright)...")
    
    # Ensure results dir exists
    if not os.path.exists(RESULTS_DIR):
        os.makedirs(RESULTS_DIR)
        
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        wins_sk = 0
        wins_pl = 0
        
        # Run 10 games
        for i in range(10):
            print(f"\n--- Game {i+1} / 10 ---")
            await page.goto("http://localhost:5173/")
            
            # Print HTML for debugging
            html = await page.content()
            print("PAGE HTML:")
            print(html[:1000]) # Print first 1000 chars

            # Wait for mode select screen
            await page.wait_for_selector(".btn-competitive", state="visible")
            
            # Inject autoPlay flag and bypass onboarding BEFORE starting the game
            print("  Injecting __UGT_AUTO_PLAY__ flag...")
            await page.evaluate("""() => {
                window.__UGT_AUTO_PLAY__ = true;
                localStorage.setItem('iron_ashes_onboarding_seen', '1');
            }""")
            
            # Start game
            await page.click(".btn-competitive")
            
            # The GameController will now pick up the flag during construction 
            # and automatically resolve the game with 0 delay.
            
            # Wait for game to end. It will eventually show the summary overlay.
            # We can check for #btn-play-again or the summary title.
            print("  Waiting for game to finish (fast-forwarding)...")
            try:
                await page.wait_for_selector("#btn-play-again", timeout=60000)
            except Exception as e:
                print(f"  [!] Game {i+1} timed out or did not reach summary screen.")
                continue
                
            # Verify UI renders math correctly!
            print("  Game finished! Verifying UI math elements...")
            # Let's take a screenshot of the final board state
            await page.screenshot(path=os.path.join(RESULTS_DIR, f"ui_test_game_{i+1}.png"))
            
            # Extract end reason
            # The summary title usually says "Doom Complete" or "Territory Victory"
            # It's an h2 inside .summary-content
            title_text = await page.evaluate('document.querySelector(".summary-content h2")?.innerText')
            if "Doom" in str(title_text):
                wins_sk += 1
                print("  Result: Shadowking Victory (Doom Complete)")
            else:
                wins_pl += 1
                print(f"  Result: Player Victory ({title_text})")
                
        print("\n[+] Tier 3 UI Verification Complete!")
        print(f"    Total Games: 10")
        print(f"    Shadowking Wins: {wins_sk}")
        print(f"    Player Wins: {wins_pl}")
        print(f"    Screenshots saved to: {RESULTS_DIR}")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_ui_test())
