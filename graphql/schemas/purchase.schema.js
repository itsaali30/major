const purchaseSchema = `#graphql
  type PurchaseOrder {
    POID: Int!
    WarehouseID: Int!
    MerchantID: Int!
    TotalAmount: Float
    ExpectedDate: String
    Status: String
    CreatedBy: Int
    ApprovedBy: Int
    CreatedAt: String
    UpdatedAt: String
    Items: [PurchaseOrderItem]
    
    # Virtual Fields
    WarehouseName: String
    MerchantName: String
  }

  type PurchaseOrderItem {
    ItemID: Int!
    POID: Int!
    VariantID: Int!
    VariantName: String
    UOM: String
    Qty: Int
    Cost: Float
    Subtotal: Float
    variant: Variant
  }

  input PurchaseOrderItemInput {
    ItemID: Int
    VariantID: Int!
    Qty: Int!
    Cost: Float!
    UOM: String
  }

  extend type Query {
    allPurchaseOrders(Status: String): [PurchaseOrder]
    purchaseOrder(POID: Int!): PurchaseOrder
  }

  extend type Mutation {
    createPurchaseOrder(
      WarehouseID: Int!, 
      MerchantID: Int!, 
      ExpectedDate: String, 
      Status: String,
      Items: [PurchaseOrderItemInput!]!
    ): PurchaseOrder

    updatePurchaseOrder(
      POID: Int!,
      WarehouseID: Int,
      MerchantID: Int,
      ExpectedDate: String,
      Status: String,
      Items: [PurchaseOrderItemInput]
    ): PurchaseOrder

    deletePurchaseOrder(POID: Int!): Boolean
  }
`;

module.exports = purchaseSchema;
