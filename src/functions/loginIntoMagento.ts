import "dotenv/config";
import { Page } from "puppeteer";

export default async function loginIntoMagento(magentoPage: Page) {
  console.log("login to magento starting");
  // Navigate to magneto
  await magentoPage.goto(
    `https://www.paddypallin.com.au/agpallin_20/admin/dashboard/index/key/${process.env.MAG_KEY}`,
  );
  await magentoPage.bringToFront();

  //login into magento
  await magentoPage.waitForSelector("#username");
  await magentoPage.type(
    "input#username",
    process.env.MAGENTO_USERNAME as string,
  );
  await magentoPage.type("input#login", process.env.MAGENTO_PASSWORD as string);
  await magentoPage.click("button.action-login");

  // i need to check if login worked and return a promise. same as pronto login

  try {
    await magentoPage.waitForSelector("#productsOrderedGrid_table");
  } catch (err) {
    console.error(err);
    return Promise.reject("did not login into magento");
  }
  return Promise.resolve("mag logged in");
}
