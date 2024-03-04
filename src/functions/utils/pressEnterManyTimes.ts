import { Page } from "puppeteer";

// press enter many times
export async function pressEnterManyTimes(page: Page, presses: number) {
  for (let i = 0; i < presses; i++) {
    await page.keyboard.press("Enter");
  }
}
