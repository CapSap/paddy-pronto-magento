import * as fs from "node:fs";
import { Page } from "puppeteer";

// function that takes a screenshot and saves html.
export async function saveContent(
  page: Page,
  content: string,
  filename: string,
) {
  await page.screenshot({
    path: `./screenshots/${filename}.png`,
  });
  try {
    fs.writeFileSync(`./screenshots/${filename}.html`, content);
  } catch (err) {
    console.log(err);
  }
}
