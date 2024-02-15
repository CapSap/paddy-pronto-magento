# Automating pronto selling and putting comment in magento

## Goal

2 parts:

- sell the order in pronto
- put the pronto receipt number as a comment in magento

### Challenges

- How do we tell tell the script which orders to sell?
  - give it a csv of all status 30 orders?
  - just let it go by it'self? (don't need to feed it a csv?)
    - okay so how would it be aware of what it needs to do (how many times it needs to sell?)

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
3. you will need to create a .env file with all relevant credentials
4. run `npm run dev` (this will run the tsc on all files in src and watch for changes)

## How to run script in 'production'

1. run `npm run build`
2. run `node build/schedule.js` - this will run the script every 30 mins
   2a. You can also choose to run the script once only with
   `npm run once`
