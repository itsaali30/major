const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const invoiceResolvers = {
  Query: {
    allPurchaseInvoices: async (_, { MerchantID, Status }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const where = {};
      if (Status) where.Status = Status;
      if (MerchantID) where.MerchantID = parseInt(MerchantID);
      return await prisma.purchaseInvoices.findMany({
        where,
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
      let merchantId = args.MerchantID ? parseInt(args.MerchantID) : null;
      let poid = args.POID ? parseInt(args.POID) : null;
      if (poid && !merchantId) {
        const po = await prisma.purchaseOrders.findUnique({ where: { POID: poid } });
        if (po) merchantId = po.MerchantID;
      }
      return await prisma.purchaseInvoices.create({
        data: {
          POID: poid,
          MerchantID: merchantId,
          InvoiceNo: args.InvoiceNo,
          MerchantInvoiceNo: args.MerchantInvoiceNo || null,
          Amount: parseFloat(args.Amount),
          Tax: args.Tax ? parseFloat(args.Tax) : 0,
          Date: args.Date ? new Date(args.Date) : new Date(),
          Status: args.Status || 'unpaid',
          PaymentMode: args.PaymentMode || 'credit',
          PaidAmount: 0,
          CreatedBy: user.UserID
        }
      });
    },
    updatePurchaseInvoice: async (_, args, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const { InvoiceID, ...data } = args;
      if (data.Date) data.Date = new Date(data.Date);
      return await prisma.purchaseInvoices.update({
        where: { InvoiceID },
        data
      });
    },
    recordInvoicePayment: async (_, { InvoiceID, Amount, PaymentMode, ReferenceNo, Notes }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const inv = await prisma.purchaseInvoices.findUnique({ where: { InvoiceID: parseInt(InvoiceID) } });
      if (!inv) throw new Error('Invoice not found');

      const payAmt = parseFloat(Amount);
      const newPaid = (inv.PaidAmount || 0) + payAmt;
      const newStatus = newPaid >= (inv.Amount || 0) ? 'paid' : 'partial';

      const updated = await prisma.purchaseInvoices.update({
        where: { InvoiceID: parseInt(InvoiceID) },
        data: {
          PaidAmount: newPaid,
          Status: newStatus,
          PaymentMode: PaymentMode || inv.PaymentMode || 'cash'
        }
      });

      // Post to merchant ledger
      let merchantId = inv.MerchantID;
      if (!merchantId && inv.POID) {
        const po = await prisma.purchaseOrders.findUnique({ where: { POID: inv.POID } });
        if (po) merchantId = po.MerchantID;
      }

      if (merchantId) {
        await prisma.merchantLedger.create({
          data: {
            MerchantID: merchantId,
            Type: 'PAYMENT',
            Amount: payAmt,
            ReferenceID: inv.InvoiceID,
            Date: new Date(),
            PaymentMode: PaymentMode || 'cash',
            Notes: Notes || `Payment for Invoice ${inv.InvoiceNo || inv.InvoiceID} (${ReferenceNo || ''})`,
            CreatedBy: user.UserID
          }
        });
      }

      return updated;
    },
    deletePurchaseInvoice: async (_, { InvoiceID }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      await prisma.purchaseInvoices.delete({ where: { InvoiceID } });
      return true;
    }
  },
  PurchaseInvoice: {
    Date: (parent) => parent.Date ? parent.Date.toISOString() : null,
    CreatedAt: (parent) => parent.CreatedAt ? parent.CreatedAt.toISOString() : null,
    MerchantName: async (parent) => {
      let mid = parent.MerchantID;
      if (!mid && parent.POID) {
        const po = await prisma.purchaseOrders.findUnique({ where: { POID: parent.POID } });
        if (po) mid = po.MerchantID;
      }
      if (!mid) return 'N/A';
      const m = await prisma.merchants.findUnique({ where: { MerchantID: mid } });
      return m ? m.Name : 'N/A';
    },
    WarehouseName: async (parent) => {
      if (!parent.POID) return 'Main Warehouse';
      const po = await prisma.purchaseOrders.findUnique({ where: { POID: parent.POID } });
      if (!po) return 'N/A';
      const w = await prisma.warehouses.findUnique({ where: { WarehouseID: po.WarehouseID } });
      return w ? w.Name : 'N/A';
    }
  }
};

module.exports = invoiceResolvers;
