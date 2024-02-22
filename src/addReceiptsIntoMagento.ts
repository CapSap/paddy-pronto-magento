/*

okay so. what do i want to do?

take a csv and input the receipt number one by one.

how do i get the range of orders to put the number in?

i've got a link to all orders.

i should check a few from the 17th, 16th, and find out where it starts.

then i should read the csv, put it in a js object

then loop through array and input one by one into mag.

*/

import { oldOrders } from "./oldOrders.js";

const justOneOrder = oldOrders.slice(0, 1);

console.log(justOneOrder);

// okay nice. so i have an array of orders to put the mag number in
