import puppeteer from "puppeteer";
import { oldOrders } from "../temp/oldOrders.js";
import { retry, runAsyncFuncInSeries } from "../functions/utils.js";
import inputProntoReceiptIntoMagento from "../functions/inputProntoReceiptIntoMagento.js";
import { order } from "../types.js";
import loginIntoMagento from "../functions/loginIntoMagento.js";

(async () => {
  const correctFormat: order[] = oldOrders.map((order) => {
    return {
      magentoOrder: order.magNumber.toString(),
      prontoReceipt: order.prontoNumber.toString(),
      result:
        " cm. I think some orders got missed so adding them to magento again. They were sold okay ",
    };
  });

  const justOneOrder = correctFormat.slice(25);

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

  const orderDetailsAfterMagentoComment = await runAsyncFuncInSeries(
    justOneOrder,
    magentoPage,
    inputProntoReceiptIntoMagento,
  );

  console.log(orderDetailsAfterMagentoComment);

  console.log("all done");
  await browser.close();
})();
