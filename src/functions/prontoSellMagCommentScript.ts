import puppeteer from "puppeteer";
import loginIntoMagento from "./loginIntoMagento.js";
import loginIntoPronto from "./loginIntoPronto.js";
import navigateToSellScreen from "./navigateToSellScreen.js";
import waitAndDisplayNeo from "./waitAndDisplayNeo.js";
import sellSingleOrder from "./sellSingleOrder.js";
import inputProntoReceiptIntoMagento from "./inputProntoReceiptIntoMagento.js";
import clearSearchFilters from "./clearSearchFilters.js";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { enableLogging } from "./utils/enableLogging.js";
import { retry } from "./utils/retry.js";
import { getOrders } from "./utils/getOrders.js";
import { runAsyncFuncInSeries } from "./utils/runAsyncFuncInSeries.js";
import { easyMagOrderLog } from "./utils/easMagOrderLog.js";

export const prontoSellMagCommentScript = async () => {
  // FUNCTION CALLS

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

  // 2. Navigate to status 30
  await navigateToSellScreen(prontoPage);

  // 3. Extract out all of the pronto numbers and magento order number, and put into an array of objects.
  const orderDetails = await getOrders(prontoPage);

  // stop script if there are no orders to sell
  if (orderDetails.length === -1) {
    console.log("no orders to sell!");
    await browser.close();
    return;
  }

  // try to run on 10 orders only
  const numberOfOrdersToSell = 10;
  const smallArray = orderDetails.slice(0, numberOfOrdersToSell);

  console.log(`attempting to sell/process ${numberOfOrdersToSell} orders(s)`);

  // console.log(smallArray);

  const orderDetailsAfterProntoSelling = await runAsyncFuncInSeries(
    smallArray,
    prontoPage,
    sellSingleOrder,
  );

  const status70Orders = orderDetailsAfterProntoSelling.filter((order) =>
    order.result.includes("70"),
  );

  if (status70Orders) {
    console.log("these orders may still be at status 70: ", status70Orders);
  }

  // // 4b. Get the result of above and update magento. inputting in magento will throw an error if something wrong happens

  // clear the search filters once before runnign loop
  await clearSearchFilters(magentoPage);

  const orderDetailsAfterMagentoComment = await runAsyncFuncInSeries(
    orderDetailsAfterProntoSelling,
    magentoPage,
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
