import { parse } from "csv/sync";

import { promises as fs } from "fs"; // 'fs/promises' not available in node 12
import puppeteer from "puppeteer";
import { stringify } from "csv";
import path from "node:path";
import { fileURLToPath } from "url";
import isSkuOnWebsiteParallel from "../../functions/isSkuOnWebsiteParallel.js";
import isSkuOnWebsite from "../../functions/isSkuOnWebsite.js";

(async () => {
  // read csv file that is located in same directory as this file
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // start browser
  const browser2 = await puppeteer.launch({
    // headless: false,
    // slowMo: 250, // slow down by 250ms
  });
  const paddyWebsite = await browser2.newPage();
  await paddyWebsite.setViewport({ width: 2000, height: 2160 });
  // enableLogging(paddyWebsite);

  //read csv
  // readfile gets its's current directory from where node is being run
  const content = await fs.readFile(`${__dirname}/input.csv`);
  // parse csv and remove headings
  const records: [] = parse(content, { from: 2 });
  const skuArray = records.map((row) => row[0]);

  console.log(skuArray.length);

  const shortedSkuArray = skuArray.slice(0, 100);

  const testArray = ["00015100012L", "00487300179NS"];
  // return a new array of skus that are not on website
  const returnArray: string[] = [];

  /*

  for (const sku of testArray) {
    if (await isSkuOnWebsite(paddyWebsite, sku)) {
      returnArray.push(sku);
    }
  }
  console.log(returnArray);
*/

  // from https://advancedweb.hu/how-to-speed-up-puppeteer-scraping-with-parallelization/
  const withBrowser = async (fn) => {
    const browser = await puppeteer.launch();
    try {
      return await fn(browser);
    } finally {
      await browser.close();
    }
  };

  const withPage = (browser) => async (fn) => {
    const page = await browser.newPage();
    try {
      return await fn(page);
    } finally {
      await page.close();
    }
  };

  const results: string[] = [];

  await withBrowser(async (browser) => {
    for (const sku of shortedSkuArray) {
      const result = await withPage(browser)(async (page) => {
        await page.goto(`https://www.paddypallin.com.au/nsearch?q=${sku}`);

        try {
          await page.waitForSelector("#nxt-nrf");
          console.log(sku, "not on website");
          return sku;
        } catch (err) {
          console.log(`this sku is on webiste ${sku}`);
          return false;
        }
      });

      results.push(result);
    }
  });

  console.log("results", results);

  const filtered: string[] = results.filter((el) => el);

  // write this array to a csv

  const output = stringify([filtered]);
  await fs.writeFile(`${__dirname}/output.csv`, output);

  await browser2.close();
})();
