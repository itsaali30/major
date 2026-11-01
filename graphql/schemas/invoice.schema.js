const invoiceSchema = `#graphql
  type PurchaseInvoice {
    InvoiceID: Int!
    POID: Int
    MerchantID: Int
    InvoiceNo: String
    MerchantInvoiceNo: String
    Amount: Float
    Tax: Float
    Date: String
    Status: String
    PaymentMode: String
    PaidAmount: Float
    CreatedBy: Int
    CreatedAt: String
    
    # Relations & Virtuals
    PurchaseOrder: PurchaseOrder
    MerchantName: String
    WarehouseName: String
  }

  extend type Query {
    allPurchaseInvoices(MerchantID: Int, Status: String): [PurchaseInvoice]
    purchaseInvoice(InvoiceID: Int!): PurchaseInvoice
  }

  extend type Mutation {
    createPurchaseInvoice(
      POID: Int,
      MerchantID: Int,
      InvoiceNo: String!,
      MerchantInvoiceNo: String,
      Amount: Float!,
      Tax: Float,
      Date: String,
      Status: String,
      PaymentMode: String
    ): PurchaseInvoice

    updatePurchaseInvoice(
      InvoiceID: Int!,
      InvoiceNo: String,
      MerchantInvoiceNo: String,
      Amount: Float,
      Tax: Float,
      Date: String,
      Status: String,
      PaymentMode: String
    ): PurchaseInvoice

    recordInvoicePayment(
      InvoiceID: Int!,
      Amount: Float!,
      PaymentMode: String!,
      ReferenceNo: String,
      Notes: String
    ): PurchaseInvoice

    deletePurchaseInvoice(InvoiceID: Int!): Boolean
  }
`;

module.exports = invoiceSchema;
