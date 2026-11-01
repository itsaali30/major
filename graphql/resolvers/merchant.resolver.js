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

      // Collect IDs for batch lookups
      const grnIds = [];
      const returnIds = [];
      const userIds = [];

      entries.forEach(e => {
        if (e.CreatedBy) userIds.push(e.CreatedBy);
        if (e.Type === 'PURCHASE') {
          if (e.ReferenceID) grnIds.push(e.ReferenceID);
        } else if (e.Type === 'RETURN') {
          if (e.ReferenceID) returnIds.push(e.ReferenceID);
        } else if (e.Type === 'PAYMENT' && e.ReferenceID > 0) {
          grnIds.push(e.ReferenceID);
        }
      });

      // Batch fetch GRNs with Items
      const grns = grnIds.length > 0 ? await prisma.gRNs.findMany({
        where: { GRNID: { in: grnIds } },
        include: { Items: true }
      }) : [];
      const grnMap = new Map(grns.map(g => [g.GRNID, g]));

      // Batch fetch PurchaseReturns with Items
      const returns = returnIds.length > 0 ? await prisma.purchaseReturns.findMany({
        where: { ReturnID: { in: returnIds } },
        include: { Items: true }
      }) : [];
      const returnMap = new Map(returns.map(r => [r.ReturnID, r]));

      // Collect variant IDs for returns to get product names
      const retVariantIds = [];
      returns.forEach(r => {
        (r.Items || []).forEach(it => {
          if (it.VariantID) retVariantIds.push(it.VariantID);
        });
      });

      const variants = retVariantIds.length > 0 ? await prisma.variants.findMany({
        where: { VariantID: { in: retVariantIds } }
      }) : [];
      const variantMap = new Map(variants.map(v => [v.VariantID, v]));

      const productIds = variants.map(v => v.ProductID).filter(Boolean);
      const products = productIds.length > 0 ? await prisma.products.findMany({
        where: { ProductID: { in: productIds } }
      }) : [];
      const productMap = new Map(products.map(p => [p.ProductID, p]));

      // Warehouses
      const warehouseIds = [
        ...grns.map(g => g.WarehouseID).filter(Boolean),
        ...returns.map(r => r.WarehouseID).filter(Boolean)
      ];
      const warehouses = warehouseIds.length > 0 ? await prisma.warehouses.findMany({
        where: { WarehouseID: { in: warehouseIds } }
      }) : [];
      const warehouseMap = new Map(warehouses.map(w => [w.WarehouseID, w.Name]));

      // Users / Officers
      const users = userIds.length > 0 ? await prisma.users.findMany({
        where: { UserID: { in: userIds } },
        select: { UserID: true, UserNameFirst: true, UserNameLast: true }
      }) : [];
      const userMap = new Map(users.map(u => [
        u.UserID,
        `${u.UserNameFirst || ''} ${u.UserNameLast || ''}`.trim() || `User #${u.UserID}`
      ]));

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
          if (mode === 'cash') totalCashPaid += amt;
          else totalCreditPurchases += amt;
        } else if (type === 'PAYMENT') {
          totalPaid += amt;
          runningBalance -= amt;
          if (mode === 'cash') totalCashPaid += amt;
        } else if (type === 'RETURN') {
          totalReturns += amt;
          runningBalance -= amt;
        }

        let items = [];
        let refNum = e.ReferenceID ? `REF-${e.ReferenceID}` : `VOUCHER-${e.LedgerID}`;
        let warehouseName = null;
        let officerName = userMap.get(e.CreatedBy) || null;

        if (type === 'PURCHASE') {
          const grn = grnMap.get(e.ReferenceID);
          if (grn) {
            refNum = grn.GRNNumber || `GRN-${grn.GRNID}`;
            warehouseName = warehouseMap.get(grn.WarehouseID) || null;
            if (grn.ReceivedByName) officerName = grn.ReceivedByName;
            items = (grn.Items || []).map(it => ({
              ItemID: it.GRNItemID,
              VariantID: it.VariantID,
              VariantName: it.VariantName || `Item #${it.VariantID}`,
              Qty: it.Qty,
              Price: it.Cost,
              Subtotal: it.Subtotal || ((it.Qty || 1) * (it.Cost || 0)),
              UOM: it.UOM || 'pcs',
              Reason: null
            }));
          }
        } else if (type === 'RETURN') {
          const pr = returnMap.get(e.ReferenceID);
          if (pr) {
            refNum = pr.ReturnNo || `RET-${pr.ReturnID}`;
            warehouseName = warehouseMap.get(pr.WarehouseID) || null;
            items = (pr.Items || []).map(it => {
              const v = variantMap.get(it.VariantID);
              const p = v ? productMap.get(v.ProductID) : null;
              const vName = p ? `${p.ProductName} (${v.Size || ''} ${v.Color || ''})`.trim() : (v?.SKU || `Item #${it.VariantID}`);
              return {
                ItemID: it.ReturnItemID,
                VariantID: it.VariantID,
                VariantName: vName,
                Qty: it.Qty,
                Price: it.Price,
                Subtotal: (it.Qty || 1) * (it.Price || 0),
                UOM: 'pcs',
                Reason: it.Reason || pr.Reason || null
              };
            });
          }
        } else if (type === 'PAYMENT' && e.ReferenceID > 0) {
          const grn = grnMap.get(e.ReferenceID);
          if (grn) {
            refNum = `${grn.GRNNumber || ('GRN-' + grn.GRNID)} (Paid)`;
            warehouseName = warehouseMap.get(grn.WarehouseID) || null;
            if (grn.ReceivedByName) officerName = grn.ReceivedByName;
            items = (grn.Items || []).map(it => ({
              ItemID: it.GRNItemID,
              VariantID: it.VariantID,
              VariantName: it.VariantName || `Item #${it.VariantID}`,
              Qty: it.Qty,
              Price: it.Cost,
              Subtotal: it.Subtotal || ((it.Qty || 1) * (it.Cost || 0)),
              UOM: it.UOM || 'pcs',
              Reason: 'Cash payment settled on receipt'
            }));
          }
        }

        return {
          ...e,
          Date: e.Date ? e.Date.toISOString() : null,
          Balance: runningBalance,
          ReferenceNumber: refNum,
          WarehouseName: warehouseName,
          OfficerName: officerName,
          Items: items
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
