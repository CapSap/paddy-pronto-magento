import { Page } from "puppeteer";

// enable console logging from the headless chrome browser
export function enableLogging(page: Page) {
  page.on("console", (message) => {
    console.log(`pronto Message: ${message.text()}`);
  });
}
