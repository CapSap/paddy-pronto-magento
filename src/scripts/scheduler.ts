import { prontoSellMagCommentScript } from "../functions/main.js";

const minutes = process.argv.slice(2)[0];

async function scheduler(minutes: number) {
  const milliseconds = minutes * 60000;

  setInterval(async () => {
    console.log("Script starting at", new Date().toLocaleTimeString());
    // await prontoSellMagCommentScript();
    console.log("Script complete at ", new Date().toLocaleTimeString());
  }, milliseconds);
}

async function main(minutes) {
  // if its not a number throw an error
  if (Number.isNaN(minutes)) {
    console.log(`${minutes} is not a number`);
    // if minutes is undefined, run a default 30 mins
  } else if (minutes === undefined) {
    console.log("No minute argument passed. Running every 30 mins by default");
    await scheduler(30);
  } else {
    // and if a number is passed, run the func ever number of minutes
    await scheduler(minutes);
  }
}

main(minutes);
