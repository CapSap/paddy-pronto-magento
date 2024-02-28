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
  const browser = await puppeteer.launch({
    // headless: false,
    // slowMo: 250, // slow down by 250ms
  });
  const paddyWebsite = await browser.newPage();
  await paddyWebsite.setViewport({ width: 2000, height: 2160 });
  // enableLogging(paddyWebsite);

  //read csv
  // readfile gets its's current directory from where node is being run
  const content = await fs.readFile(`${__dirname}/input.csv`);
  // parse csv and remove headings
  const records: [] = parse(content, { from: 2 });
  const skuArray = records.map((row) => row[0]);

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

  const skusNotOnWebsite = testArray.map(async (sku) => {
    if (await isSkuOnWebsiteParallel(sku)) {
      return sku;
    } else {
      return;
    }
  });
  const resolved = await Promise.all(skusNotOnWebsite);
  console.log("resolved", resolved);

  // write this array to a csv

  const output = stringify([returnArray]);
  await fs.writeFile(`${__dirname}/output.csv`, output);

  await browser.close();
})();
