const gql = String.raw;

const typeDefs = gql`
  type Shelves {
    ShelfID: Int!
    StoreID: Int!
    ShelfCode: String
    Level: Int
    Position: Int
    Store: Stores
  }

  extend type Query {
    allShelves: [Shelves!]!
    shelvesByStore(StoreID: Int!): [Shelves!]!
    shelf(ShelfID: Int!): Shelves
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
