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

// from https://mtsknn.fi/blog/js-retry-on-fail/
// function that will try to run again x number of times before throwing
export const retry = async <T>(
  fn: () => Promise<T> | T,
  { retries, retryInterval }: { retries: number; retryInterval: number },
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }
    await sleep(retryInterval);
    return retry(fn, { retries: retries - 1, retryInterval });
  }
};
const sleep = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));
