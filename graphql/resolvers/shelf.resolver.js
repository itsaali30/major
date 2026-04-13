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
        where: { StoreID },
        orderBy: { ShelfID: 'desc' }
      });
    },
    shelf: async (_, { ShelfID }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await prisma.shelves.findUnique({
        where: { ShelfID }
      });
    }
  },
  Mutation: {
    createShelf: async (_, args, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const isAuthorized = ['superadmin', 'admin', 'manager', 'incharge'].includes(user.Role);
      if (!isAuthorized) throw new Error('Not authorized');
      
      return await prisma.shelves.create({
        data: args
      });
    },
    updateShelf: async (_, args, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const isAuthorized = ['superadmin', 'admin', 'manager', 'incharge'].includes(user.Role);
      if (!isAuthorized) throw new Error('Not authorized');

      const { ShelfID, ...updateData } = args;
      
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) delete updateData[key];
      });

      return await prisma.shelves.update({
        where: { ShelfID },
        data: updateData
      });
    },
    deleteShelf: async (_, { ShelfID }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const isAuthorized = ['superadmin', 'admin', 'manager'].includes(user.Role);
      if (!isAuthorized) throw new Error('Not authorized to delete shelves');

      await prisma.shelves.delete({
        where: { ShelfID }
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
