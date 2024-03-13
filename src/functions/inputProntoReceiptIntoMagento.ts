import { Page } from "puppeteer";
import {
  OrderCWS,
  orderWithMagCommentResult,
  orderWithSellResult,
} from "../types.js";
import { saveContent } from "./utils/saveContent.js";
import { waitTillHTMLRendered } from "./utils/waitTillHTMLRendered.js";
import createZendeskTicket from "./utils/createZendeskTicket.js";
export default async function inputProntoReceiptIntoMagento(
  order: orderWithSellResult,
  magentoPage: Page,
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

  try {
    await magentoPage.waitForSelector("div.admin__data-grid-loading-mask", {
      hidden: true,
    });
  } catch (err) {
    console.error(`issue waiting for the spinner loader ${err}`);
  }

  /*  await Promise.all([
    magentoPage.waitForSelector("tr.data-row"),
    magentoPage.waitForSelector("a.action-menu-item"),
  ]); */

  // await waitTillHTMLRendered(magentoPage);

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
  // check for CWS not found
  const doesCommentsContainCWS = /CWS Item was not found/.test(
    comments.toString(),
  );
  // extract out customer details

  // could i select all the a tags that are children of that classname?
  // that would give me all i need i think?

  const deets = await magentoPage.$eval(
    ".admin__table-secondary.order-account-information-table",
    (el) => {
      console.log("el type", typeof el);
      console.log(el.innerHTML);
      return el.innerHTML;
    },
  );
  console.log("type", typeof deets);
  console.log("deets", deets);
  const orderInfo: OrderCWS = {
    ...order,
    comments: JSON.stringify(comments),
    url: magentoPage.url(),
  };
  console.log("does order comments` contain cws?", doesCommentsContainCWS);
  // create a ticket in zendesk
  if (doesCommentsContainCWS) {
    // await createZendeskTicket(orderInfo);
  }
  return { ...order, magResult: "comment was made in magento" };
}
