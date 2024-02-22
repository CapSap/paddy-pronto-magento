# Automating pronto selling and putting comment in magento

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

## How to install and run

1. pull the repo
2. run `npm install`
3. you will need to create a .env file with all relevant credentials. See the template file for what info you will need
4. run `npm run build` this will run the tsc (typescript compiler) on all files in src.
5. If you would like to make changes, run `npm run dev`. This will run the compiler and watch for changes
6. run `npm run once` to see the script in action

## How to run script in 'production'

1. run `npm run build`
2. run `node build/scripts/schedule.js` - this will run the script every 30 mins
   - You can also choose to run the script once only with
     `npm run once`

## What's next?

- [x] Run the script every 30 mins or so using some sort of scheduler (could this be a simple while loop?)
- [ ] Check for orders that have not appeared in pronto
- [ ] Handleing of errors that I have not come accross yet
- [ ] e.g. network errors at specific points
