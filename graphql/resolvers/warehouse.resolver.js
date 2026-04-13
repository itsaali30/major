const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const resolvers = {
  Query: {
    allWarehouses: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const isAuthorized = ['superadmin', 'admin', 'manager', 'accountmanager', 'cluster', 'incharge', 'accountant', 'feltmanager', 'putter', 'picker'].includes(user.Role);
      if (!isAuthorized) throw new Error('Not authorized');
      return await prisma.warehouses.findMany({
        orderBy: { WarehouseID: 'desc' }
      });
    },
    warehouse: async (_, { WarehouseID }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const isAuthorized = ['superadmin', 'admin', 'manager'].includes(user.Role);
      if (!isAuthorized) throw new Error('Not authorized');
      return await prisma.warehouses.findUnique({
        where: { WarehouseID }
      });
    }
  },
  Mutation: {
    createWarehouse: async (_, args, { user }) => {
      if (!user) throw new Error('Not authenticated');
      if (user.Role !== 'superadmin' && user.Role !== 'admin') throw new Error('Not authorized - Managers cannot create warehouses');
      
      return await prisma.warehouses.create({
        data: args
      });
    },
    updateWarehouse: async (_, args, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const isAuthorized = ['superadmin', 'admin', 'manager', 'incharge'].includes(user.Role);
      if (!isAuthorized) throw new Error('Not authorized');

      const { WarehouseID, ...updateData } = args;
      
      // If manager, incharge, accountmanager, or cluster, they can ONLY update the Status
      if (['manager', 'incharge', 'accountmanager', 'cluster'].includes(user.Role)) {
        const statusOnly = { Status: updateData.Status };
        return await prisma.warehouses.update({
          where: { WarehouseID },
          data: statusOnly
        });
      }

      // Remove undefined fields for admins
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) delete updateData[key];
      });

      return await prisma.warehouses.update({
        where: { WarehouseID },
        data: updateData
      });
    },
    deleteWarehouse: async (_, { WarehouseID }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      if (user.Role !== 'superadmin' && user.Role !== 'admin') throw new Error('Not authorized - Managers cannot delete warehouses');

      await prisma.warehouses.delete({
        where: { WarehouseID }
      });

      return true;
    }
  }
};

module.exports = resolvers;
