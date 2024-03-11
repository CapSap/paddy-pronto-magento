import { Page } from "puppeteer";

export default async function clearSearchFilters(page: Page) {
  await page.bringToFront();
  await page.goto(
    `https://www.paddypallin.com.au/agpallin_20/sales/order/index/key/${process.env.MAG_KEY}/`,
  );
  await page.waitForSelector(
    "input.admin__control-text.data-grid-search-control",
  );
  // try to remove active filters
  console.log("try to remove active filters");
  try {
    await page.click("button.action-remove");
  } catch {
    console.log("no filters to remove");
  }
}
