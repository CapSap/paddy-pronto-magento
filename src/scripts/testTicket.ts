import puppeteer from "puppeteer";
import inputProntoReceiptIntoMagento from "../functions/inputProntoReceiptIntoMagento.js";
import { orderWithSellResult } from "../types.js";
import { retry } from "../functions/utils/retry.js";
import loginIntoMagento from "../functions/loginIntoMagento.js";
import loginIntoPronto from "../functions/loginIntoPronto.js";

async function main() {
  const order: orderWithSellResult = {
    magentoOrder: "1000581246",
    prontoReceipt: "test",
    result: "testing",
  };

  // 0. Launch the browser and open 2 new blank pages
  const browser = await puppeteer.launch({ headless: false });
  const magentoPage = await browser.newPage();
  const prontoPage = await browser.newPage();

  // Set screen size
  await prontoPage.setViewport({ width: 1920, height: 1080 });
  await magentoPage.setViewport({ width: 1920, height: 1080 });

  // enableLogging(prontoPage);
  // enableLogging(magentoPage);

  // 1. Login into pronto and magento. Retry login 2 times with 2 second interval if 1st does not work
  await Promise.all([
    retry(() => loginIntoMagento(magentoPage), {
      retries: 2,
      retryInterval: 2000,
    }),
    retry(() => loginIntoPronto(prontoPage), {
      retries: 2,
      retryInterval: 2000,
    }),
  ]);
  await inputProntoReceiptIntoMagento(order, magentoPage);
}

(async () => {
  await main();
})();
