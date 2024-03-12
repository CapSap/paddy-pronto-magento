// from https://stackoverflow.com/questions/52497252/puppeteer-wait-until-page-is-completely-loaded

import { Page } from "puppeteer";

// waitForNavigation and waitForNetworkIdle didnt work
export const waitTillHTMLRendered = async (page: Page, timeout = 30000) => {
  const checkDurationMsecs = 1000;
  const maxChecks = timeout / checkDurationMsecs;
  let lastHTMLSize = 0;
  let checkCounts = 1;
  let countStableSizeIterations = 0;
  const minStableSizeIterations = 3;

  while (checkCounts++ <= maxChecks) {
    const html = await page.content();
    const currentHTMLSize = html.length;

    /*
      const bodyHTMLSize = await page.evaluate(
        () => document.body.innerHTML.length,
      );
      console.log(
        "last: ",
        lastHTMLSize,
        " <> curr: ",
        currentHTMLSize,
        " body html size: "
        bodyHTMLSize,
      );
*/
    if (lastHTMLSize != 0 && currentHTMLSize == lastHTMLSize)
      countStableSizeIterations++;
    else countStableSizeIterations = 0; //reset the counter

    if (countStableSizeIterations >= minStableSizeIterations) {
      // console.log("Page rendered fully..");
      break;
    }

    lastHTMLSize = currentHTMLSize;
    new Promise((r) => setTimeout(r, checkDurationMsecs));
  }
};
