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

  extend type Query {
    allMerchants: [Merchant]
    merchant(MerchantID: Int!): Merchant
    merchantContacts(MerchantID: Int!): [MerchantContact]
  }

  extend type Mutation {
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
