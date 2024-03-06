import { promises as fs } from "fs"; // 'fs/promises' not available in node 12
import { stringify } from "csv";
import path from "node:path";
import { fileURLToPath } from "url";
import { parse } from "csv/sync";
import puppeteer from "puppeteer";
// import { oldOrders } from "../../temp/oldOrders.js";
import inputProntoReceiptIntoMagento from "../../functions/inputProntoReceiptIntoMagento.js";
import { orderWithSellResult } from "../../types.js";
import loginIntoMagento from "../../functions/loginIntoMagento.js";
import clearSearchFilters from "../../functions/clearSearchFilters.js";
import { retry } from "../../functions/utils/retry.js";
import { runAsyncFuncInSeries } from "../../functions/utils/runAsyncFuncInSeries.js";

(async () => {
  // read csv file that is located in same directory as this file
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // read csv (file format must have pronto receipt in first col, mag order no in second col)
  // readfile gets its's current directory from where node is being run
  const content = await fs.readFile(`${__dirname}/orders.csv`);
  // parse csv and remove headings
  const records: [] = parse(content, { from: 2 });

  const orders: orderWithSellResult[] = records.map((row) => {
    return {
      prontoNumber: row[0],
      magNumber: row[1],
      result:
        " cm. I think some orders got missed so adding them to magento again. They were sold okay ",
    };
  });

  console.log(orders.length);
  console.log(orders[0]);
  return;

  const correctFormat: orderWithSellResult[] = orders.map((order) => {
    return {
      magentoOrder: order.magNumber.toString(),
      prontoReceipt: order.prontoNumber.toString(),
      result:
        " cm. I think some orders got missed so adding them to magento again. They were sold okay ",
    };
  });

  const justOneOrder = correctFormat.slice(0, 10);

  console.log(justOneOrder);

  console.log(oldOrders.length);

  // 0. Launch the browser and open 2 new blank pages
  const browser = await puppeteer.launch();
  const magentoPage = await browser.newPage();
  const prontoPage = await browser.newPage();

  // Set screen size
  await prontoPage.setViewport({ width: 3840, height: 2160 });
  await magentoPage.setViewport({ width: 3840, height: 2160 });

  // enable console logging on prontoPage
  /*
  prontoPage.on("console", (message) => {
    console.log(`pronto Message: ${message.text()}`);
  });
  magentoPage.on("console", (message) => {
    console.log(`magneot Message: ${message.text()}`);
  });

  */

  // 1. Login into pronto and magento. Retry login 2 times with 2 second interval if 1st does not work
  await retry(() => loginIntoMagento(magentoPage), {
    retries: 2,
    retryInterval: 2000,
  }),
    console.log("login succ");

  await clearSearchFilters(magentoPage);

  const orderDetailsAfterMagentoComment = await runAsyncFuncInSeries(
    justOneOrder,
    magentoPage,
    inputProntoReceiptIntoMagento,
  );

  console.log(
    "last succ order",
    orderDetailsAfterMagentoComment.slice(
      orderDetailsAfterMagentoComment.length - 1,
    ),
  );

  await browser.close();
})();
