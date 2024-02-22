import { prontoSellMagCommentScript } from "../functions/main.js";

console.log(
  "Pronto sell and magento comment script running every 30 mins. Starting at",
  new Date().toLocaleTimeString(),
);
// 1800000 milliseonds = 30 mins
setInterval(async () => {
  console.log("Script starting at", new Date().toLocaleTimeString());
  await prontoSellMagCommentScript();
  console.log("Script complete at ", new Date().toLocaleTimeString());
}, 1800000);
