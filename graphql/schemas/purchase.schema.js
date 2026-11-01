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
    MerchantContact: String
    MerchantWhatsApp: String
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
    Cost: Float
    UOM: String
  }

  type GRN {
    GRNID: Int!
    GRNNumber: String
    Type: String
    POID: Int
    MerchantID: Int!
    WarehouseID: Int!
    StoreID: Int
    ShelfID: Int
    TotalAmount: Float
    ReceivedByID: Int
    ReceivedByName: String
    ReceivedAt: String
    Remarks: String
    Status: String
    CreatedAt: String
    Items: [GRNItem]

    WarehouseName: String
    MerchantName: String
    StoreName: String
    ShelfCode: String
    PONumber: String
  }

  type GRNItem {
    GRNItemID: Int!
    GRNID: Int!
    VariantID: Int!
    VariantName: String
    Qty: Int
    Cost: Float
    Subtotal: Float
    UOM: String
    variant: Variant
  }

  input GRNItemInput {
    VariantID: Int!
    VariantName: String
    Qty: Int!
    Cost: Float
    Subtotal: Float
    UOM: String
  }

  type PurchaseReturn {
    ReturnID: Int!
    ReturnNo: String
    MerchantID: Int!
    WarehouseID: Int!
    TotalAmount: Float
    Reason: String
    Status: String
    CreatedBy: Int
    CreatedAt: String
    Items: [PurchaseReturnItem]

    WarehouseName: String
    MerchantName: String
  }

  type PurchaseReturnItem {
    ReturnItemID: Int!
    ReturnID: Int!
    VariantID: Int!
    VariantName: String
    Qty: Int
    Price: Float
    Reason: String
    variant: Variant
  }

  input PurchaseReturnItemInput {
    VariantID: Int!
    Qty: Int!
    Price: Float
    Reason: String
  }

  extend type Query {
    allPurchaseOrders(Status: String): [PurchaseOrder]
    purchaseOrder(POID: Int!): PurchaseOrder
    allGRNs(WarehouseID: Int, MerchantID: Int): [GRN]
    grn(GRNID: Int!): GRN
    allPurchaseReturns(MerchantID: Int, WarehouseID: Int): [PurchaseReturn]
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

    createGRNAgainstPO(
      POID: Int!,
      ReceivedByID: Int,
      ReceivedByName: String,
      ReceivedAt: String,
      Items: [GRNItemInput],
      Remarks: String
    ): GRN

    createDirectGRN(
      MerchantID: Int!,
      WarehouseID: Int!,
      ReceivedByID: Int,
      ReceivedByName: String,
      ReceivedAt: String,
      Items: [GRNItemInput!]!,
      Remarks: String
    ): GRN

    createPurchaseReturn(
      MerchantID: Int!,
      WarehouseID: Int!,
      Reason: String,
      Items: [PurchaseReturnItemInput!]!
    ): PurchaseReturn
  }
`;

module.exports = purchaseSchema;
