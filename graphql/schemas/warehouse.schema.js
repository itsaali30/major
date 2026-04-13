const gql = String.raw;

const typeDefs = gql`
  type Warehouses {
    WarehouseID: Int!
    Name: String
    Address: String
    Lat: Float
    Long: Float
    Contact: String
    Type: String
    Status: String
    CreatedAt: String
    UpdatedAt: String
  }

  extend type Query {
    allWarehouses: [Warehouses!]!
    warehouse(WarehouseID: Int!): Warehouses
  }

  extend type Mutation {
    createWarehouse(
      Name: String
      Address: String
      Lat: Float
      Long: Float
      Contact: String
      Type: String
      Status: String
    ): Warehouses!

    updateWarehouse(
      WarehouseID: Int!
      Name: String
      Address: String
      Lat: Float
      Long: Float
      Contact: String
      Type: String
      Status: String
    ): Warehouses!

    deleteWarehouse(WarehouseID: Int!): Boolean!
  }
`;

module.exports = typeDefs;
