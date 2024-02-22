import puppeteer from "puppeteer";
import "dotenv/config";
import {
  retry,
  runAsyncFuncInSeries,
  saveContent,
  waitTillHTMLRendered,
} from "./utils.js";

import type {
  order,
  orderWithMagCommentResult,
  orderWithSellResult,
  orderDetails,
} from "../types.js";
import loginIntoMagento from "./loginIntoMagento.js";
import loginIntoPronto from "./loginIntoPronto.js";
import navigateToSellScreen from "./navigateToSellScreen.js";
import waitAndDisplayNeo from "./waitAndDisplayNeo.js";
import sellSingleOrder from "./sellSingleOrder.js";
import inputProntoReceiptIntoMagento from "./inputProntoReceiptIntoMagento.js";

export const prontoSellMagCommentScript = async () => {
  // FUNCTION CALLS

  // 0. Launch the browser and open 2 new blank pages
  const browser = await puppeteer.launch();
  const magentoPage = await browser.newPage();
  const prontoPage = await browser.newPage();
  await browser.close();
  console.log("all done");
  //   return;
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

  // 2. Navigate to status 30
  await navigateToSellScreen(prontoPage);

  // 3. Extract out all of the pronto numbers and magento order number, and put into an array of objects.
  const orderDetails = await prontoPage.$$eval("tbody > tr", (tr) => {
    const rowReturn = tr.reduce((acc, curr) => {
      if (curr.querySelectorAll("td")[2].innerText === "") {
        return acc;
      } else {
        return [
          ...acc,
          {
            // when the results first come through, the screen is small and only what is visible to the eye is in the DOM. to see more orders we'd need to scroll
            magentoOrder: curr.querySelectorAll("td")[2].innerText,
            prontoReceipt: curr.querySelectorAll("td")[1].innerText,
          },
        ];
      }
    }, [] as orderDetails);

    return rowReturn;
  });

  // stop script if there are no orders to sell
  if (orderDetails.length === -1) {
    console.log("no orders to sell!");
    await browser.close();
    return;
  }

  console.log("result of order details array", orderDetails);

  // log order numbers for easy mag search
  const orderNumbers = orderDetails.reduce(
    (acc, curr) => `${acc} ${curr.magentoOrder}`,
    "",
  );
  // console.log(orderNumbers);

  const smallArray = orderDetails.slice(0, 4);

  const orderDetailsAfterProntoSelling = await runAsyncFuncInSeries(
    smallArray,
    sellSingleOrder,
  );

  console.log("all pronto selling for this batch completed successfully");
  // // 4b. Get the result of above and update magento. inputting in magento will throw an error if something wrong happens
  const orderDetailsAfterMagentoComment = await runAsyncFuncInSeries(
    orderDetailsAfterProntoSelling,
    inputProntoReceiptIntoMagento,
  );
  // 4c. and then that's the end of the script?
  // what feedback do i want to give back to the user?
  console.log(
    "auto selling complete. Results: ",
    orderDetailsAfterMagentoComment,
  );

  console.log("browser close about to run");
  await browser.close();
  // just for fun
  await waitAndDisplayNeo(4);
  console.log("selling complete");
};
