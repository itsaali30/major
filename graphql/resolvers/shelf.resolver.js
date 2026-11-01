const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const resolvers = {
  Query: {
    allShelves: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await prisma.shelves.findMany({
        orderBy: { ShelfID: 'desc' }
      });
    },
    shelvesByStore: async (_, { StoreID }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await prisma.shelves.findMany({
        where: { StoreID: parseInt(StoreID) },
        orderBy: { ShelfID: 'desc' }
      });
    },
    shelf: async (_, { ShelfID }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await prisma.shelves.findUnique({
        where: { ShelfID: parseInt(ShelfID) }
      });
    }
  },
  Mutation: {
    createShelf: async (_, args, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const isAuthorized = ['superadmin', 'admin', 'manager', 'incharge'].includes(user.Role);
      if (!isAuthorized) throw new Error('Not authorized');
      
      const data = {
        StoreID: parseInt(args.StoreID),
        ShelfCode: args.ShelfCode ? String(args.ShelfCode).trim() : null,
        Level: args.Level !== undefined && args.Level !== null && !isNaN(args.Level) ? parseInt(args.Level) : 1,
        Position: args.Position !== undefined && args.Position !== null && !isNaN(args.Position) ? parseInt(args.Position) : 1
      };

      return await prisma.shelves.create({
        data
      });
    },
    updateShelf: async (_, args, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const isAuthorized = ['superadmin', 'admin', 'manager', 'incharge'].includes(user.Role);
      if (!isAuthorized) throw new Error('Not authorized');

      const { ShelfID, ...updateData } = args;
      const data = {};
      if (updateData.ShelfCode !== undefined) data.ShelfCode = updateData.ShelfCode ? String(updateData.ShelfCode).trim() : null;
      if (updateData.Level !== undefined && updateData.Level !== null && !isNaN(updateData.Level)) data.Level = parseInt(updateData.Level);
      if (updateData.Position !== undefined && updateData.Position !== null && !isNaN(updateData.Position)) data.Position = parseInt(updateData.Position);
      if (updateData.StoreID !== undefined && updateData.StoreID !== null && !isNaN(updateData.StoreID)) data.StoreID = parseInt(updateData.StoreID);

      return await prisma.shelves.update({
        where: { ShelfID: parseInt(ShelfID) },
        data
      });
    },
    deleteShelf: async (_, { ShelfID }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const isAuthorized = ['superadmin', 'admin', 'manager'].includes(user.Role);
      if (!isAuthorized) throw new Error('Not authorized to delete shelves');

      await prisma.shelves.delete({
        where: { ShelfID: parseInt(ShelfID) }
      });

      return true;
    }
  },
  Shelves: {
    Store: async (parent) => {
      return await prisma.stores.findUnique({
        where: { StoreID: parent.StoreID }
      });
    }
  }
};

module.exports = resolvers;
