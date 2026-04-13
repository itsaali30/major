const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const resolvers = {
  Query: {
    allStores: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const isAdmin = ['superadmin', 'admin'].includes(user.Role);
      
      if (isAdmin) {
        return await prisma.stores.findMany({
          include: { Warehouse: true },
          orderBy: { StoreID: 'desc' }
        });
      }

      // Non-admin: Get their assigned warehouse
      let warehouseID = null;
      const staff = await prisma.staff.findFirst({ where: { UserID: user.UserID } });
      if (staff) {
        const store = await prisma.stores.findUnique({ where: { StoreID: staff.StoreID } });
        if (store) warehouseID = store.WarehouseID;
      } else {
        const rider = await prisma.riders.findFirst({ where: { UserID: user.UserID } });
        if (rider) {
          const store = await prisma.stores.findUnique({ where: { StoreID: rider.StoreID } });
          if (store) warehouseID = store.WarehouseID;
        }
      }

      if (!warehouseID) return [];

      return await prisma.stores.findMany({
        where: { WarehouseID: warehouseID },
        include: { Warehouse: true },
        orderBy: { StoreID: 'desc' }
      });
    },
    store: async (_, { StoreID }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      // No strict change here, but record level check could be added if needed
      return await prisma.stores.findUnique({
        where: { StoreID },
        include: { Warehouse: true }
      });
    },
    storesByWarehouse: async (_, { WarehouseID }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const isAdmin = ['superadmin', 'admin'].includes(user.Role);
      
      if (!isAdmin) {
        // Verify this is their warehouse
        let assignedWarehouseID = null;
        const staff = await prisma.staff.findFirst({ where: { UserID: user.UserID } });
        if (staff) {
          const store = await prisma.stores.findUnique({ where: { StoreID: staff.StoreID } });
          if (store) assignedWarehouseID = store.WarehouseID;
        } else {
          const rider = await prisma.riders.findFirst({ where: { UserID: user.UserID } });
          if (rider) {
            const store = await prisma.stores.findUnique({ where: { StoreID: rider.StoreID } });
            if (store) assignedWarehouseID = store.WarehouseID;
          }
        }
        
        if (WarehouseID !== assignedWarehouseID) {
          throw new Error('Not authorized to view stores for this warehouse');
        }
      }

      return await prisma.stores.findMany({
        where: { WarehouseID },
        include: { Warehouse: true },
        orderBy: { StoreID: 'desc' }
      });
    }
  },
  Mutation: {
    createStore: async (_, args, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const isAuthorized = ['superadmin', 'admin', 'manager', 'incharge'].includes(user.Role);
      if (!isAuthorized) throw new Error('Not authorized');
      
      return await prisma.stores.create({
        data: args
      });
    },
    updateStore: async (_, args, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const isAuthorized = ['superadmin', 'admin', 'manager', 'accountmanager', 'cluster'].includes(user.Role);
      if (!isAuthorized) throw new Error('Not authorized to update stores');

      const { StoreID, ...updateData } = args;

      // If manager, accountmanager, or cluster, they can ONLY update the Status
      if (['manager', 'accountmanager', 'cluster'].includes(user.Role)) {
        return await prisma.stores.update({
          where: { StoreID },
          data: { Status: updateData.Status }
        });
      }
      
      // Remove undefined fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) delete updateData[key];
      });

      return await prisma.stores.update({
        where: { StoreID },
        data: updateData
      });
    },
    updateStoresStatusByWarehouse: async (_, { WarehouseID, Status }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const isAuthorized = ['superadmin', 'admin', 'manager', 'accountmanager', 'cluster'].includes(user.Role);
      if (!isAuthorized) throw new Error('Not authorized');

      await prisma.stores.updateMany({
        where: { WarehouseID },
        data: { Status }
      });
      return true;
    },
    deleteStore: async (_, { StoreID }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const isAuthorized = ['superadmin', 'admin', 'manager'].includes(user.Role);
      if (!isAuthorized) throw new Error('Not authorized to delete stores');

      await prisma.stores.delete({
        where: { StoreID }
      });

      return true;
    }
  },
  Stores: {
    Warehouse: async (parent) => {
      return await prisma.warehouses.findUnique({
        where: { WarehouseID: parent.WarehouseID }
      });
    }
  }
};

module.exports = resolvers;
