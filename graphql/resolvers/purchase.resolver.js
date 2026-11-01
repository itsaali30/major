const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const purchaseResolvers = {
  Query: {
    allPurchaseOrders: async (_, { Status }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const mgmtRoles = ['superadmin', 'admin', 'manager', 'accountmanager', 'cluster', 'incharge', 'accountant', 'feltmanager', 'putter', 'picker'];
      if (!mgmtRoles.includes(user.Role)) throw new Error('Not authorized');

      const where = Status ? { Status } : {};
      return await prisma.purchaseOrders.findMany({
        where,
        include: { Items: true },
        orderBy: { CreatedAt: 'desc' }
      });
    },
    purchaseOrder: async (_, { POID }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const mgmtRoles = ['superadmin', 'admin', 'manager', 'accountmanager', 'cluster', 'incharge', 'accountant', 'feltmanager', 'putter', 'picker'];
      if (!mgmtRoles.includes(user.Role)) throw new Error('Not authorized');

      return await prisma.purchaseOrders.findUnique({
        where: { POID: parseInt(POID) },
        include: { Items: true }
      });
    }
  },
  Mutation: {
    createPurchaseOrder: async (_, args, context) => {
      try {
        const { WarehouseID, MerchantID, ExpectedDate, Status, Items } = args;
        
        if (!WarehouseID || !MerchantID) {
          throw new Error("WarehouseID and MerchantID are mandatory.");
        }

        // Calculate subtotals and total
        let totalAmount = 0;
        const productVariantIds = (Items || []).map(i => parseInt(i.VariantID));
        const variants = await prisma.variants.findMany({
          where: { VariantID: { in: productVariantIds } }
        });
        const productIds = variants.map(v => v.ProductID);
        const products = await prisma.products.findMany({
          where: { ProductID: { in: productIds } }
        });

        const itemsWithStructure = (Items || []).map(item => {
          const v = variants.find(x => x.VariantID === parseInt(item.VariantID));
          const prod = v ? products.find(p => p.ProductID === v.ProductID) : null;
          const cost = (item.Cost !== undefined && item.Cost !== null && !isNaN(item.Cost)) ? parseFloat(item.Cost) : 0;
          const subtotal = (item.Qty || 0) * cost;
          totalAmount += subtotal;
          
          return {
            VariantID: parseInt(item.VariantID),
            VariantName: prod ? `${prod.ProductName} (${v.Size || ''} ${v.Color || ''})` : (v ? v.SKU : 'Unknown'),
            UOM: item.UOM || (v ? v.Unit : 'PCS'),
            Qty: parseInt(item.Qty || 1),
            Cost: cost,
            Subtotal: subtotal
          };
        });

        const userRole = (context.user?.Role || '').toLowerCase();
        let finalStatus = Status || 'draft';
        // Store incharge orders always land in the cart (draft)
        if (userRole === 'incharge') {
          finalStatus = 'draft';
        }

        let parsedExpectedDate = null;
        if (ExpectedDate) {
          const d = new Date(ExpectedDate);
          if (!isNaN(d.getTime())) parsedExpectedDate = d;
        }

        return await prisma.purchaseOrders.create({
          data: {
            WarehouseID: parseInt(WarehouseID),
            MerchantID: parseInt(MerchantID),
            ExpectedDate: parsedExpectedDate,
            Status: finalStatus,
            TotalAmount: totalAmount,
            CreatedBy: context.user ? context.user.UserID : null,
            Items: {
              create: itemsWithStructure
            }
          },
          include: { Items: true }
        });
      } catch (err) {
        console.error("GraphQL Error [createPurchaseOrder]:", err);
        throw err;
      }
    },

    updatePurchaseOrder: async (_, args, { user }) => {
      try {
        if (!user) throw new Error('Not authenticated');
        const { POID, WarehouseID, MerchantID, ExpectedDate, Status, Items } = args;
        
        const updateData = {};
        if (WarehouseID) updateData.WarehouseID = parseInt(WarehouseID);
        if (MerchantID) updateData.MerchantID = parseInt(MerchantID);
        if (ExpectedDate) {
          const d = new Date(ExpectedDate);
          if (!isNaN(d.getTime())) updateData.ExpectedDate = d;
        }
        if (Status) {
          // If status change is an approval action (e.g. 'ordered' or 'approved')
          if (['ordered', 'approved'].includes(Status.toLowerCase())) {
            const role = (user.Role || '').toLowerCase();
            const allowedApprovalRoles = ['superadmin', 'admin', 'manager', 'accountant', 'accountmanager', 'accountantmanager'];
            if (!allowedApprovalRoles.includes(role)) {
              throw new Error('Not authorized to approve purchase orders. Only superadmin, admin, manager, accountant, and account manager can approve.');
            }
            updateData.ApprovedBy = user.UserID;
          }
          updateData.Status = Status;
        }

        if (Items) {
          // Recalculate if items changed
          let totalAmount = 0;
          const productVariantIds = Items.map(i => parseInt(i.VariantID));
          const variants = await prisma.variants.findMany({
            where: { VariantID: { in: productVariantIds } }
          });
          const productIds = variants.map(v => v.ProductID);
          const products = await prisma.products.findMany({
            where: { ProductID: { in: productIds } }
          });

          // Delete existing items first for simplicity
          await prisma.purchaseOrderItems.deleteMany({ where: { POID: parseInt(POID) } });

          const newItems = Items.map(item => {
            const v = variants.find(x => x.VariantID === parseInt(item.VariantID));
            const prod = v ? products.find(p => p.ProductID === v.ProductID) : null;
            const cost = (item.Cost !== undefined && item.Cost !== null && !isNaN(item.Cost)) ? parseFloat(item.Cost) : 0;
            const subtotal = (item.Qty || 0) * cost;
            totalAmount += subtotal;
            return {
              VariantID: parseInt(item.VariantID),
              VariantName: prod ? `${prod.ProductName} (${v.Size || ''} ${v.Color || ''})` : (v ? v.SKU : 'Unknown'),
              UOM: item.UOM || (v ? v.Unit : 'PCS'),
              Qty: parseInt(item.Qty || 1),
              Cost: cost,
              Subtotal: subtotal
            };
          });

          updateData.TotalAmount = totalAmount;
          updateData.Items = {
            create: newItems
          };
        }

        return await prisma.purchaseOrders.update({
          where: { POID: parseInt(POID) },
          data: updateData,
          include: { Items: true }
        });
      } catch (err) {
        console.error("GraphQL Error [updatePurchaseOrder]:", err);
        throw err;
      }
    },

    deletePurchaseOrder: async (_, { POID }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const deleteRoles = ['superadmin', 'admin', 'manager'];
      if (!deleteRoles.includes((user.Role || '').toLowerCase())) {
        throw new Error('Not authorized to delete purchase orders');
      }
      await prisma.purchaseOrderItems.deleteMany({ where: { POID: parseInt(POID) } });
      await prisma.purchaseOrders.delete({ where: { POID: parseInt(POID) } });
      return true;
    }
  },
  PurchaseOrder: {
    WarehouseName: async (parent) => {
      const w = await prisma.warehouses.findUnique({ where: { WarehouseID: parent.WarehouseID } });
      return w ? w.Name : 'N/A';
    },
    MerchantName: async (parent) => {
      const m = await prisma.merchants.findUnique({ where: { MerchantID: parent.MerchantID } });
      return m ? m.Name : 'N/A';
    },
    MerchantContact: async (parent) => {
      const m = await prisma.merchants.findUnique({ where: { MerchantID: parent.MerchantID } });
      return m ? m.Contact : null;
    },
    MerchantWhatsApp: async (parent) => {
      const mc = await prisma.merchantContacts.findFirst({
        where: {
          MerchantID: parent.MerchantID,
          OR: [
            { whatsapp: { not: null } },
            { Phone: { not: null } }
          ]
        }
      });
      if (mc && (mc.whatsapp || mc.Phone)) {
        return mc.whatsapp || mc.Phone;
      }
      const m = await prisma.merchants.findUnique({ where: { MerchantID: parent.MerchantID } });
      return m ? m.Contact : null;
    }
  },
  PurchaseOrderItem: {
    variant: async (parent) => {
      const variant = await prisma.variants.findUnique({ 
        where: { VariantID: parent.VariantID }
      });
      if (!variant) return null;
      const product = await prisma.products.findUnique({
        where: { ProductID: variant.ProductID }
      });
      return { ...variant, product };
    }
  }
};

module.exports = purchaseResolvers;
