import puppeteer, { Page } from "puppeteer";
import "dotenv/config";
import { generateToken } from "authenticator";

import * as fs from "node:fs";

(async () => {
  // function that takes a screenshot and saves html.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  // press enter many times
  async function pressEnterManyTimes(presses: number) {
    for (let i = 0; i < presses; i++) {
      await prontoPage.keyboard.press("Enter");
    }
  }
  // from https://stackoverflow.com/questions/52497252/puppeteer-wait-until-page-is-completely-loaded
  // waitForNavigation and waitForNetworkIdle didnt work
  const waitTillHTMLRendered = async (page: Page, timeout = 30000) => {
    const checkDurationMsecs = 1000;
    const maxChecks = timeout / checkDurationMsecs;
    let lastHTMLSize = 0;
    let checkCounts = 1;
    let countStableSizeIterations = 0;
    const minStableSizeIterations = 3;

    while (checkCounts++ <= maxChecks) {
      const html = await page.content();
      const currentHTMLSize = html.length;

      const bodyHTMLSize = await page.evaluate(
        () => document.body.innerHTML.length,
      );

      console.log(
        "last: ",
        lastHTMLSize,
        " <> curr: ",
        currentHTMLSize,
        " body html size: ",
        bodyHTMLSize,
      );

      if (lastHTMLSize != 0 && currentHTMLSize == lastHTMLSize)
        countStableSizeIterations++;
      else countStableSizeIterations = 0; //reset the counter

      if (countStableSizeIterations >= minStableSizeIterations) {
        console.log("Page rendered fully..");
        break;
      }

      lastHTMLSize = currentHTMLSize;
      new Promise((r) => setTimeout(r, checkDurationMsecs));
    }
  };

  const runAsyncFuncInSeries = async (
    array: [],
    fun: (order: object) => void,
  ) => {
    const results = [];
    for (const order of array) {
      results.push(await fun(order));
    }
    return results;
  };

  async function loginIntoPronto() {
    console.log("loginto promto starting");
    // nav to pronto login screen and enter relevant deets
    await prontoPage.goto("https://pronto.paddypallin.com.au/");
    // sometimes page shows the verification page and the login fails. not sure why
    // below will try to find the login input element and return a rejected promise so that retry can run
    try {
      await prontoPage.waitForSelector("#login-username");
    } catch {
      await prontoPage.click("button#login-button");
      return Promise.reject(
        "could not log into pronto. could not find the login-username input",
      );
    }
    // enter login details
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
    await prontoPage.type("input#prompts", otp);
    const prontoLoginButtonFinal = "#login-button";
    await prontoPage.waitForSelector(prontoLoginButtonFinal);
    await prontoPage.click(prontoLoginButtonFinal);

    // return a promise based upon did login succeed and throw if login failed
    try {
      await prontoPage.waitForSelector("button.folder[name='Sales &Orders']");
    } catch (err) {
      console.error(err);
      return Promise.reject("did not login into pronto");
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
    console.log("finished login");
    await magentoPage.waitForNavigation();
    //TODO
    // i need to check if login worked and return a promise. same as pronto login

    try {
      await prontoPage.waitForSelector("button.folder[name='Sales &Orders']");
    } catch (err) {
      console.error(err);
      return Promise.reject("did not login into magento");
    }
  }

  async function navigateToSellScreen() {
    console.log("nav to sell screen fun running");
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
    const firstInput =
      "input[title='Enter the customer you wish to enquire on']";
    await prontoPage.waitForSelector(firstInput);
    await pressEnterManyTimes(4);
    await prontoPage.keyboard.type("208");

    await pressEnterManyTimes(4);
    await prontoPage.keyboard.type("30");
    await pressEnterManyTimes(8);
    await prontoPage.waitForSelector("td.data-tbody");
  }

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
    console.log("sell single order fun running for", order);
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
      "div.screen-input",
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
    await prontoPage.keyboard.type("u");
    await prontoPage.keyboard.type("70");
    await pressEnterManyTimes(3);

    // select external-email as the printer
    const externalEmail = await prontoPage.waitForSelector(
      `::-p-text("external-email")`,
    );
    await externalEmail?.click();

    // not sure if i need this waitfor net idle
    await prontoPage.waitForNetworkIdle();
    // print and email the receipt to customer
    await pressEnterManyTimes(3);

    // check header screen to make sure order was sold/updated successfully
    try {
      await prontoPage.waitForSelector('label[title="Ready to Update"]');
    } catch {
      console.log(
        `Order ${order.magentoOrder} / ${order.prontoReceipt} failed to sell order status was not set to 'ready to update'`,
      );
      return {
        ...order,
        result: "failed to sell automatically. problem somewhere in pronto -cm",
      };
    }

    console.log("sell single in pronto finished for", order);
    await prontoPage.keyboard.press("Escape");
    await prontoPage.waitForNetworkIdle();

    // what should singlesell return?
  }

  async function inputProntoReceiptIntoMagento(order: orderWithSellResult) {
    console.log("input recept in mag func running on ", order);
    // nav to order search page
    await magentoPage.goto(
      `https://www.paddypallin.com.au/agpallin_20/sales/order/index/key/${process.env.MAG_KEY}/`,
    );
    await magentoPage.waitForSelector(
      "input.admin__control-text.data-grid-search-control",
    );
    // try to remove active filters
    console.log("try to remove active filters");
    try {
      await magentoPage.click("button.action-remove");
    } catch {
      console.log("no filters to remove");
    }

    console.log("clear input");
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

    await Promise.all([magentoPage.keyboard.press("Enter")]);
    await waitTillHTMLRendered(magentoPage);

    await Promise.all([
      magentoPage.waitForSelector("tr.data-row"),
      magentoPage.waitForSelector("a.action-menu-item"),
    ]);
    const newUrl = await magentoPage.$eval("a.action-menu-item", (el) => {
      console.log(`this is the order being navigated to: ${el}`);
      return el.getAttribute("href");
    });
    if (!newUrl) {
      throw new Error("could not get URL from mag order");
    }

    await magentoPage.goto(newUrl);

    // Check if comment was added successfully
    const magOrderNumberFromPage = await magentoPage.$eval(
      "h1.page-title",
      (el) => {
        return el.innerText.replace("#", "");
      },
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

    // this function should return a promise similar to pronto sell func.
    console.log(JSON.stringify(comments));
  }
  // FUNCTION CALLS

  // 0. Launch the browser and open 2 new blank pages
  const browser = await puppeteer.launch();
  const magentoPage = await browser.newPage();
  const prontoPage = await browser.newPage();
  // Set screen size
  await prontoPage.setViewport({ width: 3840, height: 2160 });
  await magentoPage.setViewport({ width: 3840, height: 2160 });

  // enable console logging on prontoPage
  prontoPage.on("console", (message) => {
    console.log(`pronto Message: ${message.text()}`);
  });
  magentoPage.on("console", (message) => {
    console.log(`magneot Message: ${message.text()}`);
  });

  // 1. Login into pronto and magento. Retry login 2 times with 2 second interval if 1st does not work
  await retry(loginIntoPronto, { retries: 2, retryInterval: 2000 });
  await browser.close();
  return;
  await retry(loginIntoMagento, { retries: 2, retryInterval: 2000 });

  // 2. Navigate to status 30
  await navigateToSellScreen();

  // 3. Extract out all of the pronto numbers and magento order number, and put into an array of objects.
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

  console.log("result of order details array", orderDetails);

  // 4a. Sell a small array and see what the results are
  // array of 1 order .
  const smallArray = orderDetails.slice(0, 2);

  console.log("small array", smallArray);

  const orderDetailsAfterProntoSelling = await runAsyncFuncInSeries(
    smallArray,
    sellSingleOrder,
  );

  console.log(
    "this should be an array of orders with result key",
    orderDetailsAfterProntoSelling,
  );
  // // 4b. Get the result of above and update magento. inputting in magento will throw an error if something wrong happens
  const orderDetailsAfterMagentoComment = await runAsyncFuncInSeries(
    orderDetailsAfterProntoSelling,
    inputProntoReceiptIntoMagento,
  );
  // 4c. and then that's the end of the script?
  // what feedback do i want to give back to the user?

  console.log("browser close about to run");
  await browser.close();
  // just for fun
  console.log("selling complete");
  await new Promise((r) => setTimeout(r, 2000));
  console.log(`xkkxxxkxxxkkxkkxkkxxxkkxxkl.   .';;;,,;:'..,:::okdodddkkkkkOXWWMMWKxdooxxxddxxxxxxxkkkOOkxdxkkddxkxx
  xkxxxxxxxxxkxkxxkxxxkkxxxkl.....,::,,'';'..,:llxkddddxkOOO0KNWWMMMNxoddxxxddxxdxxxxkkkkOkxddxxddxxxx
  xxxdxxxxdxxkkkkxkxxxxxxxxxd;...';;'.........,cldxooolloodxkOOKXNNWW0xKKkxxddxxdddxxkkxxkxxxdxxxxxxxd
  dxdddxxdddxxkkkkkxxxxxxdxxko,.....          ..'cc;:;.........'ldx00KXWKxxxddxdddodxxkxxxxxxdxxxxxdxx
  dxxdodxdddxxkkkkkxxxxxxdddxxl'.'.              ',,;.         .;,,okKNWKxddddxdddodxxxxxxxxxdxxxxxxxd
  dxxdddddddxxxxxxxxddxxddddolo:;:.              '::c'         .;,'dXNKKKkddddxdddddddxxxxxxdddxkxxdoo
  dxxdxxxddddxxdddxddddddddoccocco;.            .;dkOo'.       .clxXWWX0KOdoodddddddddxxxxxxdddxxdoood
  dddodxxxdddxddddddddddddddc:ccldl;'..        ..ck0K0dc;....';o0NWMMWNNKxdooodddddddddddxxxddoooooddd
  xdoooddddodddooddddddddddxxo::cdo:;,,,........,lk0K0Oxoc:loxk0XNWMWWWXxodoooodddddddddddxxddlloddddd
  xxooddddooddoooddddddddddxddoc:odl:;;;,......',lk0K0OOkkkOkkkO0KNMWNXkoooolloddooddddxddxxxdlclddddd
  ddoodxxdoodddoodddddddddddddddoodoc::;;,'....';lkKKKKKxdxkkkOOOKNWNKxooloollloooooddxxxdxxxdollodxxd
  odoodxxdooddooodddoodoooddddxxddoolcc:;;,'.',,;cdO000XOloxkO0XXKNWKdoooololllloooodxxxddxkxdollodxxd
  oolloddoooddooodooooooooodddddoooolccc:;,,'''.';::;,;dOxddkKNWWWWNOooooooollcloooodxxddodxxdlllodxxd
  lllloooolooooloddooooooddddxxdoooollcc:;,''......',;okOOOxk0NWWWWKxooooollllcloolodxxdoodxxocclodxxd
  clllooollloolloddooooooodddxxdoooolllc:;,'''...,';coxxxxxOOOXMWWXkooodolllllllollodxdolodxxoccclodoo
  ccllolllllllllooooooloooddddxoloodollc:;,'''...,''',;::ccokOXWWWKdooooolllllcllolodxdoloddolcccclloo
  ::clllccloolloooollloooooddoooooooollc:,'.'.........',:ccclxXWWWKdoooollllllcclllooddolloolcc:cclllo
  ::lllccclooooooooolloooooddooloooolcclc;,,;;,'..'',,;cldxxdkXWWWXkolooccclolcclllloooolooolc:cccclll
  :cllcclllloooooooollodooodooollol,';:cc:;,;;,''..',;:clodxOKXNWWWKdlolccclocclllllooolloool::ccccllo
  llllllllloooooooooooodolooooollc'  .':;,;,;;,'.',:cldxk0KK0O0NNXXNKdoollllolccclllooolcoool::cccccoo
  llclllllllloooooooooodoloolllol'     ...'',;,'',,;;:coxO0OkkO0OkOKN0dollcloolccllllllllllolc::cccclo
  llcclcllllloooooooooddoooooool'         ...''.''''''',lO0kxdooodxOKNKxoooooollllolclllllllocccclccod
  ,,,,;;;::::ccccclc:clllcloodo'            ....''....';dOxl;,;:cloxOKNKdolclolcccc:::::cc::c;;;:c;:oo
  ,,',;;;;;;:::ccccc:cloool:;:;               ...''...',;,....';:cldx0XNX0kdolc::::;;,,,;:;;;,'',;,,cc
  ''',;;,,;;;:clollclooc;..  ..                 ........     ..';:codk0K0XNNX0kdlc:;;,,;;;,,,,,,;;,,::
  ,'',,,;cooddddooc,..                                        ..,:clok00O0KXXXNNK0koc;;;;;;;,,;;;;,,;:
  :;;clllllc:::;;;'.                                          ..';:cok0OOO0KKKKXNNNNX0Okdl:;;;;;;,,,;:
  lc:;'..........                                              ..';cdkOkOO000KKKKKXXXXNNNX0kdc:::;,,::
  ..                                                            .,:ldkkkkO0OOOOO000000KKXNNWNX0kdc;;:;
                                                               ..',,:olloodxxxdoxxxxkkkOO0KXXNNWNKOdl:
                                                              .  ...'::,;cccllccllooddddxxxkO00KXNNNKk
                                        .                        .. .;,',;:ccc:::::lllcclodddxxkkO0KNN
                                        .                       ..  .,'.'',,;:;,',;cc;;;cloodddddxxk0O
                                       ..           .           .   .'......',''.'':c'.,;:cllddooodxdl`);
})();
