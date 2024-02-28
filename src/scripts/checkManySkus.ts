import { parse } from "csv/sync";
import checkSingleSkuOnWebsite from "../functions/checkSingleSkuOnWebsite.js";

import { promises as fs } from "fs"; // 'fs/promises' not available in node 12
import { runAsyncFuncInSeries } from "../functions/utils/runAsyncFuncInSeries.js";

(async () => {
  //read csv
  const content = await fs.readFile(`./input.csv`);
  // parse csv and remove header
  const records = parse(content, { from: 2 });
  const skuArray = records.map((row) => row[0]);
  console.log(skuArray);

  //   await checkSingleSkuOnWebsite("00487300179NS");

  const skusNotOnWebsite = skuArray.reduce(async (acc, curr) => {
    // run check function.

    await checkSingleSkuOnWebsite(curr);

    // if func returns true, then return sku
  });
})();
