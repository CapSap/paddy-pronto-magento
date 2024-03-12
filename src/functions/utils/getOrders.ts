import { Page } from "puppeteer";
import { orderDetails } from "../../types.js";

export async function getOrders(page: Page): Promise<orderDetails> {
  return await page.$$eval("tbody > tr", (tr) => {
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
}
