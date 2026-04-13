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
        const productVariantIds = Items.map(i => parseInt(i.VariantID));
        const variants = await prisma.variants.findMany({
          where: { VariantID: { in: productVariantIds } },
          include: { Product: true }
        });

        const itemsWithStructure = Items.map(item => {
          const v = variants.find(x => x.VariantID === parseInt(item.VariantID));
          const subtotal = (item.Qty || 0) * (item.Cost || 0);
          totalAmount += subtotal;
          
          return {
            VariantID: parseInt(item.VariantID),
            VariantName: v ? `${v.Product.ProductName} (${v.Size || ''} ${v.Color || ''})` : 'Unknown',
            UOM: item.UOM || (v ? v.Unit : 'PCS'),
            Qty: parseInt(item.Qty),
            Cost: parseFloat(item.Cost),
            Subtotal: subtotal
          };
        });

        return await prisma.purchaseOrders.create({
          data: {
            WarehouseID: parseInt(WarehouseID),
            MerchantID: parseInt(MerchantID),
            ExpectedDate: ExpectedDate ? new Date(ExpectedDate) : null,
            Status: Status || 'draft',
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

    updatePurchaseOrder: async (_, args) => {
      try {
        const { POID, WarehouseID, MerchantID, ExpectedDate, Status, Items } = args;
        
        const updateData = {};
        if (WarehouseID) updateData.WarehouseID = parseInt(WarehouseID);
        if (MerchantID) updateData.MerchantID = parseInt(MerchantID);
        if (ExpectedDate) updateData.ExpectedDate = new Date(ExpectedDate);
        if (Status) updateData.Status = Status;

        if (Items) {
          // Recalculate if items changed
          let totalAmount = 0;
          const productVariantIds = Items.map(i => parseInt(i.VariantID));
          const variants = await prisma.variants.findMany({
            where: { VariantID: { in: productVariantIds } },
            include: { Product: true }
          });

          // Delete existing items first for simplicity
          await prisma.purchaseOrderItems.deleteMany({ where: { POID: parseInt(POID) } });

          const newItems = Items.map(item => {
            const v = variants.find(x => x.VariantID === parseInt(item.VariantID));
            const subtotal = (item.Qty || 0) * (item.Cost || 0);
            totalAmount += subtotal;
            return {
              VariantID: parseInt(item.VariantID),
              VariantName: v ? `${v.Product.ProductName} (${v.Size || ''} ${v.Color || ''})` : 'Unknown',
              UOM: item.UOM || (v ? v.Unit : 'PCS'),
              Qty: parseInt(item.Qty),
              Cost: parseFloat(item.Cost),
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

    deletePurchaseOrder: async (_, { POID }) => {
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
    }
  },
  PurchaseOrderItem: {
    variant: async (parent) => {
        return await prisma.variants.findUnique({ 
            where: { VariantID: parent.VariantID },
            include: { Product: true }
        });
    }
  }
};

module.exports = purchaseResolvers;
