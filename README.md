# Automating pronto selling and putting comment in magento

## A list of commands (cheatsheet)

`npm run build` - this will re-build the script files after you have made changes

`npm run once` - this will run the selling script once

`npm run skip` - this will run the selling script once and skip the first order (due to credit limit)

`npm run scheduler` - this will run the selling script once every 30 mins

`node build/scripts/scheduler/scheduler.js XX` - this will run the selling script every XX number of minutes

## Goal

Overall goal is to automate a tedious admin process that invovles 2 seperate systems that are linked only by a human process. About 1-2 mins of human time will be saved per order

2 parts to this script:

- Complete the selling process in pronto
- After selling, put the pronto receipt number as a comment in magento within the order page

### Challenges

A big challenge were the intermittant failings, and pupateer's waitForNetworkIdle() and waitForNavigation() were not enough to ensure that the DOM was fully loaded.

I also had a little trouble trying to run an async function, passing each element in an array. AND this function must run synchronously ie in series. (fun bug discovered here). I think I'd like to refactor and use a .reduce but I had some trouble with typesript. I'm still having trouble with typescript, and I don't like that I'm avoiding using reduce.

### Imagined workflow

1. login to mag and pronto web
2. get to the right place in pronto
3. extract all the pronto data
4. loop through data and do nessessary pronto steps
5. get a result value and provide to user (pronto successful or not)
6. do nessessary magento steps
7. done

## Prerequisite software required to run script

- node (using nvm is a good idea!)
- git

## How to install and contribute

1. pull the repo
2. run `npm install`
3. you will need to create a .env file with all relevant credentials.
4. run `npm run build` this will run the tsc (typescript compiler) on all files in src.
5. If you would like to make changes, run `npm run dev`. This will run the compiler and watch for changes
6. run `npm run once` to see the script in action

## How to complete tasks (detailed instructions)

### How to sell orders (Sell in pronto, add receipt no into magento)

1. Ensure that the terminal is open in the project folder. Should look like this:

![terminal](/readme-pics/terminal2.png)

2. Also ensure that you are connected to the paddy vpn network (browser needs access to magento)
3. Type `node build/scripts/runOnce.js` or `node run once` and press enter to run this command (you can use tab to autocomplete)
4. Sit back and relax
5. Any dramas report to charlie or submit an issue on github

### Sell in pronto, add receipt no into magento - Run on a schedule

1. run `npm run build`
2. Ensure that you are connected to network and running VPN
3. From the root folder run `node build/scripts/scheduler/scheduler.js XX`
   (the XX is where you will put a number in minutes)
4. This will run the script for XX number of minutes. If you don't put anything, the script will run every 30 mins by default

### Add receipts into Magento

1. run `npm run build`
2. Ensure that you are connected to network and running VPN
3. You will need to put a CSV into this folder: /build/scripts/addReceiptsIntoMagneo
4. The headings must be there (the first line will be removed) and the order must be:

| prontoNumber | magnetoNumber |
| ------------ | ------------- |
| 123456       | 10000000      |

5. run `node build/scripts/addReceiptsIntoMagento/addReceiptsIntoMagentoViaCsv.js`

### If you have the data from the output of a console, you can run this script with this data as a JS object

1. Go into the addReceiptsIntoMagento.ts file, and import the data
2. Tweak the script within this file to accept the data
3. run `npm run build`
4. run `node build/scripts/addReceiptsIntoMagento/addReceiptsIntoMagento.js`

## What's next?

- [x] Run the script every 30 mins or so using some sort of scheduler (could this be a simple while loop?)
- [x] Check for CWS not found`
- [ ] Check for orders that have not appeared in pronto
- [ ] Handleing of errors that I have not come accross yet
- [ ] e.g. network errors at specific points
