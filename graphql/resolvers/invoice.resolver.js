const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const invoiceResolvers = {
  Query: {
    allPurchaseInvoices: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await prisma.purchaseInvoices.findMany({
        include: { PurchaseOrder: true },
        orderBy: { CreatedAt: 'desc' }
      });
    },
    purchaseInvoice: async (_, { InvoiceID }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await prisma.purchaseInvoices.findUnique({
        where: { InvoiceID },
        include: { PurchaseOrder: true }
      });
    }
  },
  Mutation: {
    createPurchaseInvoice: async (_, args, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await prisma.purchaseInvoices.create({
        data: {
          ...args,
          CreatedBy: user.UserID
        }
      });
    },
    updatePurchaseInvoice: async (_, args, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const { InvoiceID, ...data } = args;
      return await prisma.purchaseInvoices.update({
        where: { InvoiceID },
        data
      });
    },
    deletePurchaseInvoice: async (_, { InvoiceID }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      await prisma.purchaseInvoices.delete({ where: { InvoiceID } });
      return true;
    }
  },
  PurchaseInvoice: {
    Date: (parent) => parent.Date ? parent.Date.toISOString() : null,
    CreatedAt: (parent) => parent.CreatedAt ? parent.CreatedAt.toISOString() : null
  }
};

module.exports = invoiceResolvers;
