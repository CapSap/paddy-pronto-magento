import { orderDetails } from "../../types.js";
// log a simple string of order numbers for easy magento search
export function easyMagOrderLog(orderDetails: orderDetails) {
  const orderNumbers = orderDetails.reduce(
    (acc, curr) => `${acc} ${curr.magentoOrder}`,
    "",
  );
  console.log(orderNumbers);
}
