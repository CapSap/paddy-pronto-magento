import { Page } from "puppeteer";
import { order } from "../../types.js";
import { easyMagOrderLog } from "./easMagOrderLog.js";

export const runAsyncFuncInSeries = async <T extends order, R>(
  array: T[],
  page: Page,
  fun: (order: T, page: Page) => Promise<R>,
) => {
  const results = [];
  try {
    for (const order of array) {
      results.push(await fun(order, page));
    }
  } catch (err) {
    console.log("problem selling somewhere");
    console.log("list of batch", array);
    easyMagOrderLog(array);
    console.error(err);
  }

  return results;
};
