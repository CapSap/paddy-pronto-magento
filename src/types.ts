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
