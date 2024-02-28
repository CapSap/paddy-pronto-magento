// take in a sku string, search on mag page.

import { Page } from "puppeteer";
import { saveContent } from "./utils/saveContent.js";

export default async function isSkuOnWebsite(
  paddyWebsite: Page,
  sku: string,
): Promise<boolean> {
  // nav to paddy website
  await paddyWebsite.goto(`https://www.paddypallin.com.au/nsearch?q=${sku}
  `); /* ;

  // search in searchbar and submit
  await paddyWebsite.type("input#search", sku);
  await paddyWebsite.$eval("form#search_mini_form", (form) => form.submit());
 */
  // take a screenshot
  await new Promise((r) => setTimeout(r, 3000));
  const pageAfterType = await paddyWebsite.content();
  await saveContent(paddyWebsite, pageAfterType, "pageAfterType");

  /* // look for #amasty-shopby-product-list

  try {
    await paddyWebsite.waitForSelector("#amasty-shopby-product-list");
    return false;
  } catch (err) {
    console.log(sku, "not on website");
    return true;
  } */

  // return true if sku is not on website
  try {
    await paddyWebsite.waitForSelector("#nxt-nrf");
    console.log(sku, "not on website");
    return true;
  } catch (err) {
    console.log(`this sku is on webiste ${sku}`);
    return false;
  }

  // at the search results page. check if no results
  // so if we can find the selector no results, return {sku: sku, results: not found}

  // but what is the output? while we're here what is the input?

  // input will be the csv.
  // output will be another csv- all skus not on website.
}
