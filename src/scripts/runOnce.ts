import { prontoSellMagCommentScript } from "../functions/prontoSellMagCommentScript.js";
import waitAndDisplayNeo from "../functions/waitAndDisplayNeo.js";

(async () => {
  await prontoSellMagCommentScript();
  await waitAndDisplayNeo(4);
})();
