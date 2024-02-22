import * as fs from "node:fs";
import { Page } from "puppeteer";
import {
  order,
  orderWithMagCommentResult,
  orderWithSellResult,
} from "../types.js";

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

// press enter many times
export async function pressEnterManyTimes(page: Page, presses: number) {
  for (let i = 0; i < presses; i++) {
    await page.keyboard.press("Enter");
  }
}
// from https://stackoverflow.com/questions/52497252/puppeteer-wait-until-page-is-completely-loaded
// waitForNavigation and waitForNetworkIdle didnt work
export const waitTillHTMLRendered = async (page: Page, timeout = 30000) => {
  const checkDurationMsecs = 1000;
  const maxChecks = timeout / checkDurationMsecs;
  let lastHTMLSize = 0;
  let checkCounts = 1;
  let countStableSizeIterations = 0;
  const minStableSizeIterations = 3;

  while (checkCounts++ <= maxChecks) {
    const html = await page.content();
    const currentHTMLSize = html.length;

    /*
      const bodyHTMLSize = await page.evaluate(
        () => document.body.innerHTML.length,
      );
      console.log(
        "last: ",
        lastHTMLSize,
        " <> curr: ",
        currentHTMLSize,
        " body html size: ",
        bodyHTMLSize,
      );
*/
    if (lastHTMLSize != 0 && currentHTMLSize == lastHTMLSize)
      countStableSizeIterations++;
    else countStableSizeIterations = 0; //reset the counter

    if (countStableSizeIterations >= minStableSizeIterations) {
      // console.log("Page rendered fully..");
      break;
    }

    lastHTMLSize = currentHTMLSize;
    new Promise((r) => setTimeout(r, checkDurationMsecs));
  }
};

export const runAsyncFuncInSeries = async (
  array: order[] | orderWithSellResult[],
  fun: (
    order: order | orderWithSellResult,
  ) => Promise<orderWithSellResult> | Promise<orderWithMagCommentResult>,
) => {
  const results = [];
  for (const order of array) {
    results.push(await fun(order));
  }
  return results;
};
