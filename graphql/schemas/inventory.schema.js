const inventorySchema = `#graphql
  type StockLocation {
    WarehouseID: Int
    WarehouseName: String
    StoreID: Int
    StoreName: String
    StoreType: String
    ShelfID: Int
    ShelfCode: String
    OnHandQty: Int
    AvailableQty: Int
    ReservedQty: Int
    IsReturnStore: Boolean
  }

  type ReturnStoreInfo {
    StoreID: Int
    StoreName: String
    WarehouseID: Int
    WarehouseName: String
    ShelfID: Int
    ShelfCode: String
    ReturnStockQty: Int
  }

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

    WarehouseID: Int
    WarehouseName: String
    StoreName: String
    StoreType: String
    ShelfCode: String
    ReturnStore: ReturnStoreInfo
    AllLocations: [StockLocation]

    # Values: Cost Value & Sale Value
    UnitCost: Float
    UnitSalePrice: Float
    CostValue: Float
    SaleValue: Float
  }

  extend type Query {
    allStocks(WarehouseID: Int, StoreID: Int): [Stock]
    stock(StockID: Int!): Stock
    variantLocations(VariantID: Int!, WarehouseID: Int): [StockLocation]
    returnStoreInfo(WarehouseID: Int!, VariantID: Int): ReturnStoreInfo
  }

  extend type Mutation {
    updateStock(StoreID: Int!, VariantID: Int!, OnHandQty: Int!, ReservedQty: Int, ShelfID: Int): Stock
    adjustStock(StockID: Int!, Adjustment: Int!): Stock
  }
`;

module.exports = inventorySchema;
