const gql = String.raw;

const typeDefs = gql`
  type Stores {
    StoreID: Int!
    WarehouseID: Int!
    StoreName: String
    Address: String
    Lat: Float
    Long: Float
    Type: String
    Status: String
    Warehouse: Warehouses
  }

  extend type Query {
    allStores: [Stores!]!
    store(StoreID: Int!): Stores
    storesByWarehouse(WarehouseID: Int!): [Stores!]!
  }

  extend type Mutation {
    createStore(
      WarehouseID: Int!
      StoreName: String
      Address: String
      Lat: Float
      Long: Float
      Type: String
      Status: String
    ): Stores!

    updateStore(
      StoreID: Int!
      WarehouseID: Int
      StoreName: String
      Address: String
      Lat: Float
      Long: Float
      Type: String
      Status: String
    ): Stores!

    updateStoresStatusByWarehouse(
      WarehouseID: Int!
      Status: String!
    ): Boolean!

    deleteStore(StoreID: Int!): Boolean!
  }
`;

module.exports = typeDefs;
