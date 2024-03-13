export type order = {
  magentoOrder: string;
  prontoReceipt: string;
};

export type orderWithSellResult = {
  magentoOrder: string;
  prontoReceipt: string;
  result: string;
};

export type orderWithMagCommentResult = orderWithSellResult & {
  magResult: string;
};

export type orderDetails = { magentoOrder: string; prontoReceipt: string }[];

export type OrderCWS = {
  magentoOrder: string;
  comments: string;
  url: string;
  name: string;
  email: string;
  phone: string;
};
