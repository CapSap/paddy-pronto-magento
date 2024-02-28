// take in a sku string, search on mag page.

import puppeteer from "puppeteer";
import { saveContent } from "./utils/saveContent.js";
import { waitTillHTMLRendered } from "./utils/waitTillHTMLRendered.js";
import { enableLogging } from "./utils/enableLogging.js";

export default async function checkSingleSkuOnWebsite(
  sku: string,
  description: string,
) {
  // create a browswer.

  const browser = await puppeteer.launch();
  const paddyWebsite = await browser.newPage();

  // nav to paddy website
  await paddyWebsite.goto("https://www.paddypallin.com.au/price-match");

  enableLogging(paddyWebsite);

  // search in searchbar and submit
  await paddyWebsite.type("input#search", sku);
  await paddyWebsite.$eval("form#search_mini_form", (form) => form.submit());

  // take a screenshot
  await new Promise((r) => setTimeout(r, 3000));
  const pageAfterType = await paddyWebsite.content();
  await saveContent(paddyWebsite, pageAfterType, "pageAfterType");

  // at the search results page. check if no results
  // so if we can find the selector no results, return {sku: sku, results: not found}

  await browser.close();
}
