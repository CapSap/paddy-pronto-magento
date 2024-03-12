import { prontoSellMagCommentScript } from "../functions/prontoSellMagCommentScript.js";

console.log(
  "Pronto sell and magento comment script running every 2 hrs. Starting at",
  new Date().toLocaleTimeString(),
);
// 1800000 milliseonds = 30 mins
// 7200000 milliseconds = 2 hours
setInterval(async () => {
  console.log("Script starting at", new Date().toLocaleTimeString());
  await prontoSellMagCommentScript();
  console.log("Script complete at ", new Date().toLocaleTimeString());
}, 7200000);
