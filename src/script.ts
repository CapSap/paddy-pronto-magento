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
    // nav to pronto login screen and enter relevant deets
    await prontoPage.goto("https://pronto.paddypallin.com.au/");
    // sometimes page shows the verification page and the login fails. how come?
    const contentJustAfterLoad = await prontoPage.content();
    await saveContent(
      prontoPage,
      contentJustAfterLoad,
      "just-after-intial-page-load.png",
    );
    await prontoPage.waitForSelector("#login-username");
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

  // for every pronto receipt number, sell in pronto and then add a string status to the array
  // sold successfully or not

  // then deposit number into magento comment

  // then give results to user

  // save page snapshot as latest
  const latestContent = await prontoPage.content();
  await saveContent(prontoPage, latestContent, "latest");

  // extract out all of the pronto numbers and magento order number, and put into an array of objects.
  const orderDetails = await prontoPage.$$eval("tbody > tr", (tr) => {
    const rowReturn = tr.map((row) => {
      return {
        // when the results first come through, the screen is small and only what is visible to the eye is in the DOM. to see more orders we'd need to scroll
        magentoOrder: row.querySelectorAll("td")[2].innerText,
        prontoReceipt: row.querySelectorAll("td")[1].innerText,
      };
    });

    return rowReturn;
  });
  console.log("final", orderDetails);

  orderDetails.map((order) => {
    console.log(order.prontoReceipt);
  });

  await browser.close();
})();
