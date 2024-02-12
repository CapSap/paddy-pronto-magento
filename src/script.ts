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
  // Navigate to magneto
  await magentoPage.goto(
    `https://www.paddypallin.com.au/agpallin_20/admin/dashboard/index/key/${process.env.MAG_KEY}`,
  );
  // enable loggin on prontoPage
  prontoPage.on("console", (message) => {
    console.log(`Message: ${message.text()}`);
  });

  // function to save content html
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

  // do i need this function anymore? and it's also not that reliable ie i can't call it at anytime? or maybe i can
  const didLoginSucced = async () => {
    try {
      await prontoPage.waitForSelector("button.folder[name='Sales &Orders']");
      return true;
    } catch (err) {
      throw new Error("login failed");
    }
  };
  // from https://mtsknn.fi/blog/js-retry-on-fail/
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

  // login is unreliable. not sure why.
  // should i be .goto for every login attempt?

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
      console.log("could not log in");

      return Promise.reject("from the promise: could not log in");
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
    await prontoPage.screenshot({ path: "./screenshots/justBeforeLogin.png" });
    console.log("log in attempt running");
    await prontoPage.click(prontoLoginButtonFinal);
    await prontoPage.screenshot({
      path: "./screenshots/just-after-login-attempt.png",
    });
    // return a promise based upon did login succeed and throw if login failed
    return await prontoPage.waitForSelector(
      "button.folder[name='Sales &Orders']",
    );
  }
  // retry login 2 times with 2 second interval
  await retry(loginIntoPronto, { retries: 2, retryInterval: 2000 });

  // checking if login worked
  console.log("did login succced?", await didLoginSucced());

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

  const firstOrder = orderDetails[0];
  type order = {
    magentoOrder: string;
    prontoReceipt: string;
  };
  async function sellSingleOrder(order: order) {
    console.log("pronto sell attempt for", order);

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

    await new Promise((r) => setTimeout(r, 60000));
    // below screenshotshould show select printer screen
    const doubleCheck = await prontoPage.content();
    await saveContent(prontoPage, doubleCheck, "doubleCheck");

    // select external-email as the printer
    const externalEmail = await prontoPage.waitForSelector(
      `::-p-text("external-email")`,
    );
    await externalEmail?.click();

    // below screenshot should show external-email selected
    await new Promise((r) => setTimeout(r, 60000));
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

  const res = await sellSingleOrder(firstOrder);
  console.log("res", res);
  const latestContent = await prontoPage.content();
  await saveContent(prontoPage, latestContent, "last");

  await browser.close();
})();
