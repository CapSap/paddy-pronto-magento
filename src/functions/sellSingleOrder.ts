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
