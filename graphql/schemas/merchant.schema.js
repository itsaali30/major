const merchantSchema = `#graphql
  type Merchant {
    MerchantID: Int!
    Name: String
    GSTIN: String
    Address: String
    Contact: String
    Category: String
    Status: String
  }

  type MerchantContact {
    ContactID: Int!
    MerchantID: Int!
    Name: String
    Phone: String
    phone2: String
    Email: String
    whatsapp: String
    Role: String
  }

  type MerchantLedgerEntry {
    LedgerID: Int!
    MerchantID: Int!
    Type: String
    Amount: Float
    ReferenceID: Int
    Date: String
    Balance: Float
    PaymentMode: String
    Notes: String
    CreatedBy: Int
  }

  type MerchantLedgerSummary {
    MerchantID: Int!
    MerchantName: String
    GSTIN: String
    Contact: String
    Address: String
    TotalPurchases: Float
    TotalPaid: Float
    TotalReturns: Float
    BalanceDue: Float
    TotalCashPaid: Float
    TotalCreditPurchases: Float
    Entries: [MerchantLedgerEntry]
  }

  extend type Query {
    allMerchants: [Merchant]
    merchant(MerchantID: Int!): Merchant
    merchantContacts(MerchantID: Int!): [MerchantContact]
    merchantLedger(MerchantID: Int!): MerchantLedgerSummary
  }

  extend type Mutation {
    recordMerchantPayment(
      MerchantID: Int!,
      Amount: Float!,
      PaymentMode: String!,
      ReferenceNo: String,
      Notes: String
    ): MerchantLedgerEntry
    createMerchant(
      Name: String!
      GSTIN: String
      Address: String
      Contact: String
      Category: String
      Status: String
    ): Merchant

    updateMerchant(
      MerchantID: Int!
      Name: String
      GSTIN: String
      Address: String
      Contact: String
      Category: String
      Status: String
    ): Merchant

    deleteMerchant(MerchantID: Int!): Boolean

    createMerchantContact(
      MerchantID: Int!
      Name: String
      Phone: String
      phone2: String
      Email: String
      whatsapp: String
      Role: String
    ): MerchantContact

    updateMerchantContact(
      ContactID: Int!
      Name: String
      Phone: String
      phone2: String
      Email: String
      whatsapp: String
      Role: String
    ): MerchantContact

    deleteMerchantContact(ContactID: Int!): Boolean
  }
`;

module.exports = merchantSchema;
