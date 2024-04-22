import { Page } from "puppeteer";
import { orderWithMagCommentResult, orderWithSellResult } from "../types.js";
import { saveContent } from "./utils/saveContent.js";
import { waitTillHTMLRendered } from "./utils/waitTillHTMLRendered.js";
import createZendeskTicket from "./utils/createZenTicket.js";
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
  // await magentoPage.click('button[title="Submit Comment"]');
  // check if comment was sent successfully
  await magentoPage.waitForSelector("div.loading-mask", { hidden: true });

  await waitTillHTMLRendered(magentoPage);
  await magentoPage.waitForSelector("ul.note-list");

  // save customer name and email locally
  const customerDetails = await magentoPage.$$eval(
    "table.admin__table-secondary.order-account-information-table tbody tr",
    (rows) => {
      const data = {
        customerName: "",
        email: "",
      };
      if (rows.length >= 2) {
        const customerNameElement = rows[0].querySelector("td") as HTMLElement;
        const emailElement = rows[1].querySelector("td a") as HTMLElement;

        const customerName = customerNameElement.innerText.trim();
        const email = emailElement.innerText.trim();

        data.customerName = customerName;
        data.email = email;
      }
      return data; // Return the extracted data
    },
  );

  //check comments for cws not found.
  // maybe there is a better way to get all the text in all of the comments?
  // parent el.innerText ?

  const comments = await magentoPage.$$eval(
    "div.note-list-comment",
    (el, customerDetails, magOrderNumberFromPage) => {
      return el.map((comment) => {
        console.log(comment.innerText);
        // check comments for text cws not found, and if found raise a ticket
        if (comment.innerText.includes("CWS")) {
          const body = `Hi CS,
        During the selling process this magento order no ${magOrderNumberFromPage} has a e-gift card that failed to generate (CWS not found)
        There is a chance that the issue as been looked at already / raised seperately / so please check if the customer is sorted already 

        If not, Could you please reach out to the customer and ask for 
        1. Receipent Email
        2. Receiptent name 
        3. message

        Thanks - Charlie via node`;

          const subject = "TEST ticket";
          // get the customer and order details
          // ive got the order number
          // get customer email, name,
          return;
          createZendeskTicket({
            subject: subject,
            body: body,
            magentoOrderNo: magOrderNumberFromPage,
          });
        }

        return comment.innerText;
      });
    },
    customerDetails,
    magOrderNumberFromPage,
  );

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
