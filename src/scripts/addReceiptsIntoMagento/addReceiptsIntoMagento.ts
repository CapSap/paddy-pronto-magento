import puppeteer from "puppeteer";
import inputProntoReceiptIntoMagento from "../../functions/inputProntoReceiptIntoMagento.js";
import { orderWithSellResult } from "../../types.js";
import loginIntoMagento from "../../functions/loginIntoMagento.js";
import clearSearchFilters from "../../functions/clearSearchFilters.js";
import { orders2 } from "../../temp/orders2.js";
import { retry } from "../../functions/utils/retry.js";
import { runAsyncFuncInSeries } from "../../functions/utils/runAsyncFuncInSeries.js";
import { enableLogging } from "../../functions/utils/enableLogging.js";

(async () => {
  // this scripts needs a a JS object to sell against. create a .js file in the temp folder, ensure that it is formatted correctly and then sell as normal using common functions

  const failedOrder: orderWithSellResult[] = [
    {
      magentoOrder: "1000543872",
      prontoReceipt: "test",
      result: "test",
    },
  ];

  const correctFormat: orderWithSellResult[] = orders2.map((order) => {
    return {
      magentoOrder: order.magentoOrder.toString(),
      prontoReceipt: order.prontoReceipt.toString(),
      result:
        " cm. I think some orders got missed so adding them to magento again. They were sold okay ",
    };
  });

  const justOneOrder = correctFormat.slice(10);

  // console.log(justOneOrder);

  // console.log(orders2.length);

  // 0. Launch the browser and open 2 new blank pages
  const browser = await puppeteer.launch({});
  const magentoPage = await browser.newPage();
  const prontoPage = await browser.newPage();

  // Set screen size
  await prontoPage.setViewport({ width: 3840, height: 2160 });
  await magentoPage.setViewport({ width: 3840, height: 2160 });

  // enable console logging on prontoPage
  enableLogging(magentoPage);
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
    // console.log("login succ");

    await clearSearchFilters(magentoPage);

  const orderDetailsAfterMagentoComment = await runAsyncFuncInSeries(
    failedOrder,
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
