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
    },
    merchantLedger: async (_, { MerchantID }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const mid = parseInt(MerchantID);
      const merchant = await prisma.merchants.findUnique({ where: { MerchantID: mid } });
      if (!merchant) throw new Error('Merchant not found');

      // Fetch all ledger entries
      const entries = await prisma.merchantLedger.findMany({
        where: { MerchantID: mid },
        orderBy: { Date: 'asc' }
      });

      let totalPurchases = 0;
      let totalPaid = 0;
      let totalReturns = 0;
      let totalCashPaid = 0;
      let totalCreditPurchases = 0;
      let runningBalance = 0;

      const processedEntries = entries.map(e => {
        const amt = e.Amount || 0;
        const type = (e.Type || '').toUpperCase();
        const mode = (e.PaymentMode || '').toLowerCase();

        if (type === 'PURCHASE' || type === 'INVOICE') {
          totalPurchases += amt;
          runningBalance += amt;
          if (mode === 'credit' || !mode) totalCreditPurchases += amt;
        } else if (type === 'PAYMENT') {
          totalPaid += amt;
          runningBalance -= amt;
          if (mode === 'cash') totalCashPaid += amt;
        } else if (type === 'RETURN') {
          totalReturns += amt;
          runningBalance -= amt;
        }

        return {
          ...e,
          Date: e.Date ? e.Date.toISOString() : null,
          Balance: runningBalance
        };
      });

      const mc = await prisma.merchantContacts.findFirst({
        where: {
          MerchantID: mid,
          OR: [
            { whatsapp: { not: null } },
            { Phone: { not: null } }
          ]
        }
      });
      const whatsapp = (mc && (mc.whatsapp || mc.Phone)) || merchant.Contact || null;

      return {
        MerchantID: merchant.MerchantID,
        MerchantName: merchant.Name,
        GSTIN: merchant.GSTIN,
        Contact: merchant.Contact,
        WhatsApp: whatsapp,
        Address: merchant.Address,
        TotalPurchases: totalPurchases,
        TotalPaid: totalPaid,
        TotalReturns: totalReturns,
        BalanceDue: totalPurchases - totalPaid - totalReturns,
        TotalCashPaid: totalCashPaid,
        TotalCreditPurchases: totalCreditPurchases,
        Entries: processedEntries.reverse()
      };
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
    },
    recordMerchantPayment: async (_, { MerchantID, Amount, PaymentMode, ReferenceNo, Notes }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const mid = parseInt(MerchantID);
      const payAmt = parseFloat(Amount);
      const entry = await prisma.merchantLedger.create({
        data: {
          MerchantID: mid,
          Type: 'PAYMENT',
          Amount: payAmt,
          ReferenceID: 0,
          PaymentMode: PaymentMode || 'cash',
          Notes: Notes || `Payment (${ReferenceNo || PaymentMode})`,
          Date: new Date(),
          CreatedBy: user.UserID
        }
      });
      return {
        ...entry,
        Date: entry.Date ? entry.Date.toISOString() : null
      };
    }
  }
};

module.exports = resolvers;
