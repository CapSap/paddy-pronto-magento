import puppeteer from "puppeteer";
import "dotenv/config";
import { generateToken } from "authenticator";
import {
  pressEnterManyTimes,
  retry,
  runAsyncFuncInSeries,
  saveContent,
  waitTillHTMLRendered,
} from "./functions/utils.js";

import type {
  order,
  orderWithMagCommentResult,
  orderWithSellResult,
} from "./types.js";

export const prontoSellMagCommentScript = async () => {
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
    return Promise.resolve("pronto login successfully");
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

    // i need to check if login worked and return a promise. same as pronto login
    try {
      await prontoPage.waitForSelector("button.folder[name='Sales &Orders']");
    } catch (err) {
      console.error(err);
      return Promise.reject("did not login into magento");
    }
    return Promise.resolve("mag logged in");
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
    await pressEnterManyTimes(prontoPage, 4);
    await prontoPage.keyboard.type("208");

    await pressEnterManyTimes(prontoPage, 4);
    await prontoPage.keyboard.type("30");
    await pressEnterManyTimes(prontoPage, 8);
    await prontoPage.waitForSelector("td.data-tbody");
  }

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
    await prontoPage.waitForNetworkIdle();
    await prontoPage.keyboard.press("h");

    // Check if the order in pronto matches order passed as argument
    await prontoPage.waitForNetworkIdle();
    await waitTillHTMLRendered(prontoPage);

    // be aware: below selector fails intermittently rarely. is there a better selector i could wait for?
    // why is it failing?

    const screenInputFail = await prontoPage.content();
    await saveContent(prontoPage, screenInputFail, "screenInputFail");

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
    await pressEnterManyTimes(prontoPage, 3);

    // select external-email as the printer
    const externalEmail = await prontoPage.waitForSelector(
      `::-p-text("external-email")`,
    );
    await externalEmail?.click();

    // not sure if i need this waitfor net idle
    await prontoPage.waitForNetworkIdle();
    // print and email the receipt to customer
    await pressEnterManyTimes(prontoPage, 3);

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

    return {
      ...order,
      result: "sold in pronto by node script -cm",
    };
  }

  async function inputProntoReceiptIntoMagento(
    order: orderWithSellResult,
  ): Promise<orderWithMagCommentResult> {
    if (!Object.prototype.hasOwnProperty.call(order, "result")) {
      throw new Error(
        "wrong argument passed as parameter to inputProntoReceiptIntoMagento function",
      );
    }

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
    // how to wait for spinner to be display none
    await magentoPage.waitForSelector("div.admin__data-grid-loading-mask", {
      hidden: true,
    });

    await waitTillHTMLRendered(magentoPage);

    await Promise.all([
      magentoPage.waitForSelector("tr.data-row"),
      magentoPage.waitForSelector("a.action-menu-item"),
    ]);

    await waitTillHTMLRendered(magentoPage);

    // i need a better wait.as another idea i could extract out this function and try again until we get to the right page
    // /*
    // wait for the first element in the search results table to equal the search input
    try {
      await magentoPage.waitForSelector(
        `::-p-xpath(/html/body/div[2]/main/div[2]/div/div/div/div[4]/table/tbody/tr[1]/td[2]/div[contains(text(),"${order.magentoOrder}")])`,
      );
    } catch (err) {
      console.log("did not find the element via xpath");
      console.error(err);
      // throw new Error("did not wait for page navigation");
    }
    // */
    const screenBeforeClick = await magentoPage.content();
    await saveContent(magentoPage, screenBeforeClick, "screenBeforeClick");

    // should find a better way of clicking?
    // click on the row that has the order number?
    // a click on any element in the row will take user to the order page?
    // how do i select the parent element based upon child innerText,
    // then click on the a tag in that parent

    await Promise.all([
      magentoPage.click("td > a"),
      magentoPage.waitForNavigation(),
    ]);

    const screenAfterClick = await magentoPage.content();
    await saveContent(magentoPage, screenAfterClick, "screenAfterClick");

    // Check if we have navigated to correct page

    const magOrderNumberFromPage = await magentoPage.$eval(
      "h1.page-title",
      (el) => {
        return el.innerText.replace("#", "");
      },
    );
    if (magOrderNumberFromPage !== order.magentoOrder) {
      console.log(orderNumbers);
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
    await magentoPage.waitForSelector("div.loading-mask", { hidden: true });

    await waitTillHTMLRendered(magentoPage);
    await magentoPage.waitForSelector("ul.note-list");
    const comments = await magentoPage.$$eval("div.note-list-comment", (el) => {
      return el.map((comment) => {
        console.log(comment.innerText);
        return comment.innerText;
      });
    });

    console.log(JSON.stringify(comments));

    //what should this function return? how should we handle errors / make user aware of erros?
    // e.g. network drops out during selling.

    if (!JSON.stringify(comments).includes(order.prontoReceipt)) {
      console.log("did not find order comment ");
      return Promise.reject(
        `did not find order comments for${order.magentoOrder} `,
      );
    }
    return { ...order, magResult: "comment was made in magento" };
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
    retry(loginIntoMagento, { retries: 2, retryInterval: 2000 }),
    retry(loginIntoPronto, { retries: 2, retryInterval: 2000 }),
  ]);

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
  console.log("selling complete");
  await new Promise((r) => setTimeout(r, 4000));
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
};
