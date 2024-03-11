import { Page } from "puppeteer";
import { order, orderWithSellResult } from "../types.js";
import { waitTillHTMLRendered } from "./utils/waitTillHTMLRendered.js";
import { saveContent } from "./utils/saveContent.js";
import { pressEnterManyTimes } from "./utils/pressEnterManyTimes.js";

export default async function sellSingleOrder(
  order: order,
  prontoPage: Page,
): Promise<orderWithSellResult> {
  // select td with correct mag order number
  console.log("sell single order fun running for", order);
  const magOrder = await prontoPage.waitForSelector(
    `::-p-text("${order.magentoOrder}")`,
  );
  if (!magOrder) {
    throw new Error("could not find order");
  }

  await waitTillHTMLRendered(prontoPage);
  await magOrder.click();

  await prontoPage.waitForNetworkIdle();
  await prontoPage.keyboard.press("h");

  // Check if the order in pronto matches order passed as argument
  await prontoPage.waitForNetworkIdle();
  await waitTillHTMLRendered(prontoPage);

  // be aware: below selector fails intermittently rarely. the cause is screen navigating to the wrong place (clicking on the wrong thing)
  //  i added a wait for dom render at the end of this script so that the screen should be 'fresh' and ready to start process again.

  //ps there is a loader div that has a class of main-loader, and a class of visible when the page is loading, but it's not there for moving between header and esc.

  const screenInputFail = await prontoPage.content();
  await saveContent(prontoPage, screenInputFail, "screenInputFail");

  await prontoPage.waitForNetworkIdle();
  await waitTillHTMLRendered(prontoPage);

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
  await waitTillHTMLRendered(prontoPage);
  await prontoPage.keyboard.type("70");
  await waitTillHTMLRendered(prontoPage);
  await pressEnterManyTimes(prontoPage, 3);

  // out of about 200 orders, 2 failed. the enter is not reliable to get to next screen / step
  // better solution is to click on okay button

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
  await waitTillHTMLRendered(prontoPage);
  await prontoPage.waitForNetworkIdle();

  return {
    ...order,
    result: "sold in pronto by node script -cm",
  };
}
