import { prontoSellMagCommentScript } from "../../functions/prontoSellMagCommentScript.js";

const userInput = process.argv.slice(2)[0];

function scheduler(minutes: number) {
  const milliseconds = minutes * 60000;

  setInterval(async () => {
    console.log("Script starting at", new Date().toLocaleTimeString());
    await prontoSellMagCommentScript();
    await someAsyncTask();
    await delay(22);
    console.log("Script complete at ", new Date().toLocaleTimeString());
  }, milliseconds);
}
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function someAsyncTask() {
  console.log("some async task starting");
  setTimeout(() => {
    console.log("running at ", new Date().toLocaleTimeString());
  }, 20);
}

async function main(userInput: string) {
  if (userInput === undefined) {
    console.log("No minutes argument passed. Running every 30 mins by default");
    scheduler(30);
  } else if (
    Number.isNaN(Number.parseFloat(userInput)) ||
    Number.parseFloat(userInput) < 5
  ) {
    console.log(
      `${userInput} is not a valid number. Please enter a valid number, greater than 5`,
    );
  } else {
    // and if a number is passed, run the func ever number of minutes
    console.log(`Running script every ${userInput} minutes`);
    scheduler(Number.parseInt(userInput));
  }
}

main(userInput);
