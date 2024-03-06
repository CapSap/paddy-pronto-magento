import { promises as fs } from "fs"; // 'fs/promises' not available in node 12
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

// csv file must be called input, and the first col must be the pronto number, 2nd column is the magento number
// the heading must also be there. (it will be removed)
// | prontoNumber | magnetoNumber |
// | 123456       | 100000000     |

(async () => {
  // read csv file that is located in same directory as this file
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // read csv (file format must have pronto receipt in first col, mag order no in second col)
  // readfile gets its's current directory from where node is being run
  const content = await fs.readFile(`${__dirname}/input.csv`);
  // parse csv and remove headings
  const records: [] = parse(content, { from: 2 });

  const orders: { prontoNumber: string; magNumber: string }[] = records.map(
    (row) => {
      return {
        prontoNumber: row[0],
        magNumber: row[1],
      };
    },
  );

  const correctFormat: orderWithSellResult[] = orders.map((order) => {
    return {
      magentoOrder: order.magNumber.toString(),
      prontoReceipt: order.prontoNumber.toString(),
      result:
        " this is orignial pronto sale. I think some orders got missed so adding them to magento again just in case . They were sold okay -- from node-cm",
    };
  });
  // slice at index of last successful - 2
  const ordersToDo = correctFormat.slice(217);
  console.log(ordersToDo[0]);

  // return;
  // 0. Launch the browser and open 2 new blank pages
  const browser = await puppeteer.launch();
  const magentoPage = await browser.newPage();

  // Set screen size
  await magentoPage.setViewport({ width: 1080, height: 2160 });

  // 1. Login into pronto and magento. Retry login 2 times with 2 second interval if 1st does not work
  await retry(() => loginIntoMagento(magentoPage), {
    retries: 2,
    retryInterval: 2000,
  }),
    console.log("login succ");

  await clearSearchFilters(magentoPage);

  const orderDetailsAfterMagentoComment = await runAsyncFuncInSeries(
    ordersToDo,
    magentoPage,
    inputProntoReceiptIntoMagento,
  );

  //here should be some code to save the csv of orders that failed/ yet to be inputed into mag.
  // how do we get the index of where it failed?

  // its a little tricky cause the above function could fail at anytime.
  // id have to do something like wrap the entire function in a try catch. will that mess up the smaller specific try catches?
  // will the error bubble up to the top and trigger every catch?

  console.log(
    "last succ order",
    orderDetailsAfterMagentoComment.slice(
      orderDetailsAfterMagentoComment.length - 1,
    ),
  );

  await browser.close();
})();
