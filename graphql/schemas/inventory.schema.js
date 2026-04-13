const inventorySchema = `#graphql
  type Stock {
    StockID: Int!
    StoreID: Int!
    VariantID: Int!
    ShelfID: Int
    OnHandQty: Int
    ReservedQty: Int
    AvailableQty: Int
    variant: Variant
    store: Stores
  }

  extend type Query {
    allStocks(StoreID: Int!): [Stock]
    stock(StockID: Int!): Stock
  }

  extend type Mutation {
    updateStock(StoreID: Int!, VariantID: Int!, OnHandQty: Int!, ReservedQty: Int, ShelfID: Int): Stock
    adjustStock(StockID: Int!, Adjustment: Int!): Stock
  }
`;

module.exports = inventorySchema;
