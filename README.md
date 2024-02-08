# Automating pronto selling and putting comment in magento

## Goal

2 parts:
- sell the order in pronto
- put the pronto receipt number as a comment in magento

### Challenge

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
