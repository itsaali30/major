const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const resolvers = {
  Query: {
    allMerchants: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const mgmtRoles = ['superadmin', 'admin', 'manager', 'accountmanager', 'cluster', 'incharge', 'accountant', 'feltmanager', 'putter', 'picker'];
      if (!mgmtRoles.includes(user.Role)) throw new Error('Not authorized');

      return await prisma.merchants.findMany({
        orderBy: { MerchantID: 'desc' }
      });
    },
    merchant: async (_, { MerchantID }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const mgmtRoles = ['superadmin', 'admin', 'manager', 'accountmanager', 'cluster', 'incharge', 'accountant', 'feltmanager', 'felt-manager'];
      if (!mgmtRoles.includes(user.Role)) throw new Error('Not authorized');

      return await prisma.merchants.findUnique({
        where: { MerchantID }
      });
    },
    merchantContacts: async (_, { MerchantID }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const mgmtRoles = ['superadmin', 'admin', 'manager', 'accountmanager', 'cluster', 'incharge', 'accountant', 'feltmanager', 'felt-manager'];
      if (!mgmtRoles.includes(user.Role)) throw new Error('Not authorized');

      return await prisma.merchantContacts.findMany({
        where: { MerchantID }
      });
    }
  },
  Mutation: {
    createMerchant: async (_, args, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const mgmtRoles = ['superadmin', 'admin', 'manager', 'accountmanager', 'cluster', 'incharge', 'accountant', 'feltmanager', 'felt-manager'];
      if (!mgmtRoles.includes(user.Role)) throw new Error('Not authorized');

      return await prisma.merchants.create({
        data: args
      });
    },
    updateMerchant: async (_, args, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const mgmtRoles = ['superadmin', 'admin', 'manager', 'accountmanager', 'cluster', 'incharge', 'accountant', 'feltmanager', 'felt-manager'];
      if (!mgmtRoles.includes(user.Role)) throw new Error('Not authorized');

      const { MerchantID, ...updateData } = args;
      return await prisma.merchants.update({
        where: { MerchantID },
        data: updateData
      });
    },
    deleteMerchant: async (_, { MerchantID }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const mgmtRoles = ['superadmin', 'admin', 'manager', 'accountmanager', 'cluster', 'incharge', 'accountant', 'feltmanager', 'felt-manager'];
      if (!mgmtRoles.includes(user.Role)) throw new Error('Not authorized');

      await prisma.merchants.delete({
        where: { MerchantID }
      });

      return true;
    },
    createMerchantContact: async (_, args, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const mgmtRoles = ['superadmin', 'admin', 'manager', 'accountmanager', 'cluster', 'incharge', 'accountant', 'feltmanager', 'felt-manager'];
      if (!mgmtRoles.includes(user.Role)) throw new Error('Not authorized');

      return await prisma.merchantContacts.create({
        data: args
      });
    },
    updateMerchantContact: async (_, args, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const mgmtRoles = ['superadmin', 'admin', 'manager', 'accountmanager', 'cluster', 'incharge', 'accountant', 'feltmanager', 'felt-manager'];
      if (!mgmtRoles.includes(user.Role)) throw new Error('Not authorized');

      const { ContactID, ...updateData } = args;
      return await prisma.merchantContacts.update({
        where: { ContactID },
        data: updateData
      });
    },
    deleteMerchantContact: async (_, { ContactID }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const mgmtRoles = ['superadmin', 'admin', 'manager', 'accountmanager', 'cluster', 'incharge', 'accountant', 'feltmanager', 'felt-manager'];
      if (!mgmtRoles.includes(user.Role)) throw new Error('Not authorized');

      await prisma.merchantContacts.delete({
        where: { ContactID }
      });

      return true;
    }
  }
};

module.exports = resolvers;
