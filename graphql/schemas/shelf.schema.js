const gql = String.raw;

const typeDefs = gql`
  type Shelves {
    ShelfID: Int!
    StoreID: Int!
    ShelfCode: String
    Level: Int
    Position: Int
    Store: Stores
    TotalItemsCount: Int
    TotalUnits: Int
  }

  type ShelfItem {
    VariantID: Int!
    ProductID: Int
    ProductName: String
    SKU: String
    Size: String
    Color: String
    Unit: String
    OnHandQty: Int
    AvailableQty: Int
    ReservedQty: Int
  }

  type ShelfReceiving {
    GRNID: Int
    GRNNumber: String
    Type: String
    VariantID: Int
    VariantName: String
    SKU: String
    Qty: Int
    Cost: Float
    ReceivedByID: Int
    ReceivedByName: String
    ReceivedAt: String
    MerchantName: String
    Remarks: String
  }

  type ShelfMovementRecord {
    MovementID: Int
    VariantID: Int
    VariantName: String
    SKU: String
    FromStoreID: Int
    FromStoreName: String
    ToStoreID: Int
    ToStoreName: String
    FromShelf: String
    ToShelf: String
    Qty: Int
    Type: String
    Date: String
    CreatedBy: Int
    CreatedByName: String
  }

  type ShelfAuditDetails {
    ShelfID: Int!
    ShelfCode: String
    StoreID: Int!
    StoreName: String
    StoreType: String
    WarehouseID: Int
    WarehouseName: String
    TotalItemsCount: Int
    TotalUnits: Int
    Items: [ShelfItem]
    Receivings: [ShelfReceiving]
    Movements: [ShelfMovementRecord]
  }

  extend type Query {
    allShelves: [Shelves!]!
    shelvesByStore(StoreID: Int!): [Shelves!]!
    shelf(ShelfID: Int!): Shelves
    shelfAuditDetails(ShelfID: Int!): ShelfAuditDetails
    storeShelvesWithAudit(StoreID: Int!): [ShelfAuditDetails]
  }

  extend type Mutation {
    createShelf(
      StoreID: Int!
      ShelfCode: String
      Level: Int
      Position: Int
    ): Shelves!

    updateShelf(
      ShelfID: Int!
      StoreID: Int
      ShelfCode: String
      Level: Int
      Position: Int
    ): Shelves!

    deleteShelf(ShelfID: Int!): Boolean!
  }
`;

module.exports = typeDefs;
