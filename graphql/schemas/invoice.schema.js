const invoiceSchema = `#graphql
  type PurchaseInvoice {
    InvoiceID: Int!
    POID: Int!
    InvoiceNo: String
    MerchantInvoiceNo: String
    Amount: Float
    Tax: Float
    Date: String
    Status: String
    CreatedBy: Int
    CreatedAt: String
    
    # Relations
    PurchaseOrder: PurchaseOrder
  }

  extend type Query {
    allPurchaseInvoices: [PurchaseInvoice]
    purchaseInvoice(InvoiceID: Int!): PurchaseInvoice
  }

  extend type Mutation {
    createPurchaseInvoice(
      POID: Int!,
      InvoiceNo: String!,
      MerchantInvoiceNo: String,
      Amount: Float!,
      Tax: Float,
      Date: String,
      Status: String
    ): PurchaseInvoice

    updatePurchaseInvoice(
      InvoiceID: Int!,
      InvoiceNo: String,
      MerchantInvoiceNo: String,
      Amount: Float,
      Tax: Float,
      Date: String,
      Status: String
    ): PurchaseInvoice

    deletePurchaseInvoice(InvoiceID: Int!): Boolean
  }
`;

module.exports = invoiceSchema;
