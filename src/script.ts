import puppeteer, { Page } from "puppeteer";
import "dotenv/config";
import { generateToken } from "authenticator";

import * as fs from "node:fs";

(async () => {
  // Launch the browser and open 2 new blank pages
  const browser = await puppeteer.launch();
  const magentoPage = await browser.newPage();
  const prontoPage = await browser.newPage();
  // Set screen size
  await prontoPage.setViewport({ width: 3840, height: 2160 });
  await magentoPage.setViewport({ width: 3840, height: 2160 });

  // HELPER FUNCTIONS
  // enable console logging on prontoPage
  prontoPage.on("console", (message) => {
    console.log(`Message: ${message.text()}`);
  });

  // function that takes a screenshot and saves html
  async function saveContent(page: Page, content: string, filename: string) {
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
  const retry = async <T>(
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

  async function loginIntoPronto() {
    console.log("loginto promto starting");

    // nav to pronto login screen and enter relevant deets
    await prontoPage.goto("https://pronto.paddypallin.com.au/");
    const contentJustAfterLoad = await prontoPage.content();
    await saveContent(
      prontoPage,
      contentJustAfterLoad,
      "just-after-intial-page-load.png",
    );
    // sometimes page shows the verification page and the login fails. not sure why
    // below will try to find the login input element and return a rejected promise so that retry can run
    try {
      await prontoPage.waitForSelector("#login-username");
    } catch {
      return Promise.reject("from the promise: could not log into pronto");
    }
    await prontoPage.type(
      "#login-username",
      process.env.PRONTO_USERNAME as string,
    );
    await prontoPage.type(
      "#login-password",
      process.env.PRONTO_PASSWORD as string,
    );
    const prontoLoginButton = "#login-button";
    await prontoPage.waitForSelector(prontoLoginButton);
    await prontoPage.click(prontoLoginButton);

    // enter 2 factor and login
    const otp = generateToken(process.env.PRONTO_KEY as string);
    await prontoPage.type("#prompts", otp);
    const prontoLoginButtonFinal = "#login-button";
    await prontoPage.waitForSelector(prontoLoginButtonFinal);
    console.log("log in attempt running");
    await prontoPage.click(prontoLoginButtonFinal);
    // return a promise based upon did login succeed and throw if login failed
    try {
      await prontoPage.waitForSelector("button.folder[name='Sales &Orders']");
    } catch (err) {
      console.error(err);
      return Promise.reject("did not login");
    }
  }

  async function loginIntoMagento() {
    console.log("login to magento starting");
    // Navigate to magneto
    await magentoPage.goto(
      `https://www.paddypallin.com.au/agpallin_20/admin/dashboard/index/key/${process.env.MAG_KEY}`,
    );
    //login into magento
    await magentoPage.waitForSelector("#username");
    await magentoPage.type(
      "input#username",
      process.env.MAGENTO_USERNAME as string,
    );
    await magentoPage.type(
      "input#login",
      process.env.MAGENTO_PASSWORD as string,
    );
    await magentoPage.click("button.action-login");
    return await magentoPage.waitForNavigation();

    //TODO
    // i need to check if login worked and return a promise. same as pronto login
  }
  // retry login 2 times with 2 second interval
  try {
    await Promise.all([
      retry(loginIntoPronto, { retries: 2, retryInterval: 2000 }),
      retry(loginIntoMagento, { retries: 2, retryInterval: 2000 }),
    ]);
  } catch {
    throw new Error("failed to login to pronto and/or magento");
  }

  // saving screen after login
  const pageContent = await prontoPage.content();
  await saveContent(
    prontoPage,
    pageContent,
    "pronto-screen-just-before-button-folder",
  );

  //Go to status 30 screen
  const salesOrder = "button.folder[name='Sales &Orders']";
  await prontoPage.waitForSelector(salesOrder);
  await prontoPage.click(salesOrder);

  await prontoPage.waitForSelector(
    "button.folder[name='&Enquire on Sales Orders']",
  );
  const orderEditMaintenance =
    "button.folder[name='&Order Edit / Maintenance']";
  await prontoPage.waitForSelector(orderEditMaintenance);
  await prontoPage.click(orderEditMaintenance);

  const salesOrderManagement = "button[name='&Sales Order Management']";
  await prontoPage.waitForSelector(salesOrderManagement);
  await prontoPage.click(salesOrderManagement);

  // press enter many times
  const firstInput = "input[title='Enter the customer you wish to enquire on']";
  await prontoPage.waitForSelector(firstInput);
  await prontoPage.keyboard.press("Enter");
  await prontoPage.keyboard.press("Enter");
  await prontoPage.keyboard.press("Enter");
  await prontoPage.keyboard.press("Enter");
  await prontoPage.keyboard.type("208");

  await prontoPage.keyboard.press("Enter");
  await prontoPage.keyboard.press("Enter");
  await prontoPage.keyboard.press("Enter");
  await prontoPage.keyboard.press("Enter");
  await prontoPage.keyboard.type("30");
  await prontoPage.keyboard.press("Enter");
  await prontoPage.keyboard.press("Enter");
  await prontoPage.keyboard.press("Enter");
  await prontoPage.keyboard.press("Enter");
  await prontoPage.keyboard.press("Enter");
  await prontoPage.keyboard.press("Enter");
  await prontoPage.keyboard.press("Enter");
  await prontoPage.keyboard.press("Enter");

  await prontoPage.waitForSelector("td.data-tbody");

  // save page snapshot as status30
  const status30 = await prontoPage.content();
  await saveContent(prontoPage, status30, "status30");

  // extract out all of the pronto numbers and magento order number, and put into an array of objects.
  type orderDetails = { magentoOrder: string; prontoReceipt: string }[];
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

  console.log("this arrray should have no empties", orderDetails);
  // okay so we got the data! whats next?
  // sell in pronto.

  type order = {
    magentoOrder: string;
    prontoReceipt: string;
  };
  type orderWithSellResult = {
    magentoOrder: string;
    prontoReceipt: string;
    result: string;
  };
  async function sellSingleOrder(order: order): Promise<orderWithSellResult> {
    // select td with correct mag order number
    const magOrder = await prontoPage.waitForSelector(
      `::-p-text("${order.magentoOrder}")`,
    );
    if (!magOrder) {
      throw new Error("could not find order");
    }
    await magOrder.click();
    await prontoPage.keyboard.press("h");

    // Check if the order in pronto matches order passed as argument
    await prontoPage.waitForNetworkIdle();
    const receiptNoFromPronto = await prontoPage.$eval(
      "div.screen-input  ",
      (el) => {
        return el.querySelector("input")?.value;
      },
    );
    if (receiptNoFromPronto !== order.prontoReceipt) {
      throw new Error(
        `Mismatch between arguments. Trying to sell ${order.prontoReceipt} / ${order.magentoOrder} but current page is on ${receiptNoFromPronto}`,
      );
    }
    // continue selling as normal
    console.log("test", receiptNoFromPronto);
    await prontoPage.keyboard.type("u");
    await prontoPage.keyboard.type("70");
    await prontoPage.keyboard.press("Enter");
    await prontoPage.keyboard.press("Enter");
    await prontoPage.keyboard.press("Enter");

    // await new Promise((r) => setTimeout(r, 60000));
    // below screenshotshould show select printer screen
    const doubleCheck = await prontoPage.content();
    await saveContent(prontoPage, doubleCheck, "doubleCheck");

    // select external-email as the printer
    const externalEmail = await prontoPage.waitForSelector(
      `::-p-text("external-email")`,
    );
    await externalEmail?.click();

    // below screenshot should show external-email selected
    // await new Promise((r) => setTimeout(r, 60000));
    const externalEmailSelected = await prontoPage.content();
    await saveContent(
      prontoPage,
      externalEmailSelected,
      "externalEmailSelected",
    );
    // not sure if i need this waitfor net idle
    await prontoPage.waitForNetworkIdle();
    // print and email the receipt to customer
    await prontoPage.keyboard.press("Enter");
    await prontoPage.keyboard.press("Enter");
    //
    await prontoPage.keyboard.press("Enter");
    await new Promise((r) => setTimeout(r, 60000));
    const statusCheck = await prontoPage.content();
    await saveContent(prontoPage, statusCheck, "statusCheck");

    // check header screen to make sure order was sold/updated successfully
    try {
      await prontoPage.waitForSelector('label[title="Ready to Update"]');
    } catch {
      console.log(
        `Order ${order.magentoOrder} / ${order.prontoReceipt} failed to sell order status was not set to 'ready to update'`,
      );
      return {
        ...order,
        result: "failed to sell automatically. problem somewhere in pronto",
      };
    }
    return {
      ...order,
      result: "sold successfully by node script",
    };
  }

  /*
  // i want to iterate through orderDetails and save a new array with the result
  const prontoSellResult = orderDetails.map((order) => {
    console.log("pronto sell attempt for", order);
    return sellSingleOrder(order);
  });

  console.log(prontoSellResult);
*/
  async function inputProntoReceiptIntoMagento(order: orderWithSellResult) {
    console.log(order);
    // nav to order search page
    await magentoPage.goto(
      `https://www.paddypallin.com.au/agpallin_20/sales/order/index/key/${process.env.MAG_KEY}/`,
    );
    await magentoPage.waitForSelector(
      "input.admin__control-text.data-grid-search-control",
    );
    // try to remove active filters
    try {
      await magentoPage.click("button.action-remove");
    } catch {
      console.log("no filters to remove");
    }
    // clear input
    const searchInput = await magentoPage.$(
      "input.admin__control-text.data-grid-search-control",
    );
    await searchInput?.evaluate((input) => (input.value = ""));

    // search for order and navigate to order detail page
    await magentoPage.type(
      "input.admin__control-text.data-grid-search-control",
      order.magentoOrder,
    );
    await magentoPage.keyboard.press("Enter");
    await magentoPage.waitForSelector("tr.data-row");
    await magentoPage.waitForSelector("a.action-menu-item");

    const newUrl = await magentoPage.$eval("a.action-menu-item", (el) =>
      el.getAttribute("href"),
    );
    if (!newUrl) {
      throw new Error("could not get URL from mag order");
    }
    // its naving to the wrong page. why?
    // oh because maybe the old result was still on the page? and we haven't navigated away yet?
    // checking terminal logs..
    // yeah we did go to a page a while back.

    await magentoPage.goto(newUrl);

    const checkingIfWereontherightPage = await magentoPage.content();
    await saveContent(magentoPage, checkingIfWereontherightPage, "check");

    // then i should do a check to see if comment was put in successfully.
    const magOrderNumberFromPage = await magentoPage.$eval(
      "h1.page-title",
      (el) => {
        return el.innerText.replace("#", "");
      },
    );
    console.log(
      "number from page and order being sold",
      magOrderNumberFromPage,
      order.magentoOrder,
    );
    if (magOrderNumberFromPage !== order.magentoOrder) {
      throw new Error(
        "script is on the wrong page! error somewhere when navigating to the order detail page",
      );
    }

    await magentoPage.waitForSelector("textarea#history_comment");
    await magentoPage.type(
      "textarea#history_comment",
      `${order.prontoReceipt} - ${order.result}`,
    );
    // submit the comment
    await magentoPage.click('button[title="Submit Comment"]');

    // check if comment was sent successfully
    await magentoPage.waitForSelector("ul.note-list");
    const comments = await magentoPage.$$eval("div.note-list-comment", (el) => {
      console.log(el);
      el.map((comment) => {
        console.log(comment.innerText);
      });
    });

    console.log(JSON.stringify(comments));

    await await new Promise((r) => setTimeout(r, 60000));
    const firstMagScreen = await magentoPage.content();
    await saveContent(magentoPage, firstMagScreen, "firstMageScreen");
  }
  //sell an array of 1 order only and see what the results are
  const arrayOfOneOrder = [orderDetails[0]];

  const orderDetailsAfterProntoSelling = arrayOfOneOrder.map((order) =>
    sellSingleOrder(order),
  );
  orderDetailsAfterProntoSelling.forEach(async (order) =>
    inputProntoReceiptIntoMagento(await order),
  );

  const latestContent = await prontoPage.content();
  await saveContent(prontoPage, latestContent, "last");

  await browser.close();
})();
