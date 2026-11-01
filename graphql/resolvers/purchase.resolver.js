const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getOrCreateFloorStoreAndShelf(warehouseId) {
  let floorStore = await prisma.stores.findFirst({
    where: {
      WarehouseID: parseInt(warehouseId),
      StoreName: { equals: 'Floor', mode: 'insensitive' }
    }
  });
  if (!floorStore) {
    floorStore = await prisma.stores.create({
      data: {
        WarehouseID: parseInt(warehouseId),
        StoreName: 'Floor',
        StoreType: 'floor'
      }
    });
  }

  let floorShelf = await prisma.shelves.findFirst({
    where: {
      StoreID: floorStore.StoreID,
      ShelfCode: { equals: 'FL01', mode: 'insensitive' }
    }
  });
  if (!floorShelf) {
    floorShelf = await prisma.shelves.create({
      data: {
        StoreID: floorStore.StoreID,
        ShelfCode: 'FL01',
        Capacity: 1000
      }
    });
  }

  return { store: floorStore, shelf: floorShelf };
}

async function addStockToShelf(storeId, shelfId, variantId, qty) {
  let stock = await prisma.stocks.findFirst({
    where: {
      StoreID: storeId,
      ShelfID: shelfId,
      VariantID: variantId
    }
  });

  if (stock) {
    await prisma.stocks.update({
      where: { StockID: stock.StockID },
      data: {
        OnHandQty: (stock.OnHandQty || 0) + qty,
        AvailableQty: (stock.AvailableQty || 0) + qty
      }
    });
  } else {
    await prisma.stocks.create({
      data: {
        StoreID: storeId,
        ShelfID: shelfId,
        VariantID: variantId,
        OnHandQty: qty,
        AvailableQty: qty,
        ReservedQty: 0
      }
    });
  }
}

async function deductStockFromShelf(storeId, shelfId, variantId, qty) {
  let stock = await prisma.stocks.findFirst({
    where: {
      StoreID: storeId,
      ShelfID: shelfId,
      VariantID: variantId
    }
  });

  if (stock) {
    const newOnHand = Math.max(0, (stock.OnHandQty || 0) - qty);
    const newAvail = Math.max(0, (stock.AvailableQty || 0) - qty);
    await prisma.stocks.update({
      where: { StockID: stock.StockID },
      data: {
        OnHandQty: newOnHand,
        AvailableQty: newAvail
      }
    });
  }
}

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
    },
    allGRNs: async (_, { WarehouseID, MerchantID }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const where = {};
      if (WarehouseID) where.WarehouseID = parseInt(WarehouseID);
      if (MerchantID) where.MerchantID = parseInt(MerchantID);
      return await prisma.gRNs.findMany({
        where,
        include: { Items: true },
        orderBy: { CreatedAt: 'desc' }
      });
    },
    grn: async (_, { GRNID }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await prisma.gRNs.findUnique({
        where: { GRNID: parseInt(GRNID) },
        include: { Items: true }
      });
    },
    allPurchaseReturns: async (_, { MerchantID, WarehouseID }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const where = {};
      if (MerchantID) where.MerchantID = parseInt(MerchantID);
      if (WarehouseID) where.WarehouseID = parseInt(WarehouseID);
      return await prisma.purchaseReturns.findMany({
        where,
        include: { Items: true },
        orderBy: { CreatedAt: 'desc' }
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
    },

    createGRNAgainstPO: async (_, { POID, ReceivedByID, ReceivedByName, ReceivedAt, Items, Remarks }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const po = await prisma.purchaseOrders.findUnique({
        where: { POID: parseInt(POID) },
        include: { Items: true }
      });
      if (!po) throw new Error('Purchase Order not found');

      const receiverId = ReceivedByID ? parseInt(ReceivedByID) : (user ? user.UserID : null);
      const receiverName = ReceivedByName || (user ? `${user.UserNameFirst || ''} ${user.UserNameLast || ''}`.trim() : '') || 'Store Incharge';
      let receivedDate = new Date();
      if (ReceivedAt) {
        const d = new Date(ReceivedAt);
        if (!isNaN(d.getTime())) receivedDate = d;
      }
      const receivedAt = receivedDate;

      const { store, shelf } = await getOrCreateFloorStoreAndShelf(po.WarehouseID);

      const itemsToReceive = (Items && Items.length > 0) ? Items : (po.Items || []);
      let totalAmount = 0;

      const grnItemsData = [];
      for (const item of itemsToReceive) {
        const qty = parseInt(item.Qty || 1);
        const cost = (item.Cost !== undefined && item.Cost !== null) ? parseFloat(item.Cost) : 0;
        const subtotal = qty * cost;
        totalAmount += subtotal;

        grnItemsData.push({
          VariantID: parseInt(item.VariantID),
          VariantName: item.VariantName || 'Item',
          Qty: qty,
          Cost: cost,
          Subtotal: subtotal,
          UOM: item.UOM || 'PCS'
        });

        // Auto add to stock in Floor store & FL01 shelf!
        await addStockToShelf(store.StoreID, shelf.ShelfID, parseInt(item.VariantID), qty);

        // Record stock movement
        await prisma.stockMovements.create({
          data: {
            VariantID: parseInt(item.VariantID),
            FromStoreID: 0,
            ToStoreID: store.StoreID,
            FromShelf: 'VENDOR',
            ToShelf: shelf.ShelfCode || 'FL01',
            Qty: qty,
            Type: 'GRN_RECEIVED',
            Date: receivedAt,
            CreatedBy: receiverId,
            CreatedByName: receiverName
          }
        });
      }

      const grnNumber = `GRN-${String(po.POID).padStart(5, '0')}-${Date.now().toString().slice(-4)}`;
      const grn = await prisma.gRNs.create({
        data: {
          GRNNumber: grnNumber,
          Type: 'PO',
          POID: po.POID,
          MerchantID: po.MerchantID,
          WarehouseID: po.WarehouseID,
          StoreID: store.StoreID,
          ShelfID: shelf.ShelfID,
          TotalAmount: totalAmount || po.TotalAmount || 0,
          ReceivedByID: receiverId,
          ReceivedByName: receiverName,
          ReceivedAt: receivedAt,
          Remarks: Remarks || `Received against PO-${String(po.POID).padStart(5, '0')}`,
          Status: 'completed',
          Items: { create: grnItemsData }
        },
        include: { Items: true }
      });

      // Update PO status to received
      await prisma.purchaseOrders.update({
        where: { POID: po.POID },
        data: { Status: 'received' }
      });

      // Post to merchant ledger
      await prisma.merchantLedger.create({
        data: {
          MerchantID: po.MerchantID,
          Type: 'PURCHASE',
          Amount: totalAmount || po.TotalAmount || 0,
          ReferenceID: grn.GRNID,
          Date: receivedAt,
          PaymentMode: 'credit',
          Notes: `GRN ${grnNumber} against PO-${String(po.POID).padStart(5, '0')}`,
          CreatedBy: receiverId
        }
      });

      return grn;
    },

    createDirectGRN: async (_, { MerchantID, WarehouseID, ReceivedByID, ReceivedByName, ReceivedAt, Items, Remarks }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      if (!MerchantID || !WarehouseID) throw new Error('Merchant and Warehouse are required');
      if (!Items || Items.length === 0) throw new Error('At least one item is required');

      const receiverId = ReceivedByID ? parseInt(ReceivedByID) : (user ? user.UserID : null);
      const receiverName = ReceivedByName || (user ? `${user.UserNameFirst || ''} ${user.UserNameLast || ''}`.trim() : '') || 'Store Incharge';
      let receivedDate = new Date();
      if (ReceivedAt) {
        const d = new Date(ReceivedAt);
        if (!isNaN(d.getTime())) receivedDate = d;
      }
      const receivedAt = receivedDate;

      const { store, shelf } = await getOrCreateFloorStoreAndShelf(WarehouseID);

      let totalAmount = 0;
      const grnItemsData = [];
      for (const item of Items) {
        const qty = parseInt(item.Qty || 1);
        const cost = (item.Cost !== undefined && item.Cost !== null) ? parseFloat(item.Cost) : 0;
        const subtotal = qty * cost;
        totalAmount += subtotal;

        grnItemsData.push({
          VariantID: parseInt(item.VariantID),
          VariantName: item.VariantName || 'Item',
          Qty: qty,
          Cost: cost,
          Subtotal: subtotal,
          UOM: item.UOM || 'PCS'
        });

        // Auto add to stock in Floor store & FL01 shelf!
        await addStockToShelf(store.StoreID, shelf.ShelfID, parseInt(item.VariantID), qty);

        // Record stock movement
        await prisma.stockMovements.create({
          data: {
            VariantID: parseInt(item.VariantID),
            FromStoreID: 0,
            ToStoreID: store.StoreID,
            FromShelf: 'VENDOR_DIRECT',
            ToShelf: shelf.ShelfCode || 'FL01',
            Qty: qty,
            Type: 'DIRECT_PURCHASE_GRN',
            Date: receivedAt,
            CreatedBy: receiverId,
            CreatedByName: receiverName
          }
        });
      }

      const grnNumber = `DGRN-${Date.now().toString().slice(-6)}`;
      const grn = await prisma.gRNs.create({
        data: {
          GRNNumber: grnNumber,
          Type: 'DIRECT',
          POID: null,
          MerchantID: parseInt(MerchantID),
          WarehouseID: parseInt(WarehouseID),
          StoreID: store.StoreID,
          ShelfID: shelf.ShelfID,
          TotalAmount: totalAmount,
          ReceivedByID: receiverId,
          ReceivedByName: receiverName,
          ReceivedAt: receivedAt,
          Remarks: Remarks || 'Direct Vendor Purchase',
          Status: 'completed',
          Items: { create: grnItemsData }
        },
        include: { Items: true }
      });

      // Post to merchant ledger
      await prisma.merchantLedger.create({
        data: {
          MerchantID: parseInt(MerchantID),
          Type: 'PURCHASE',
          Amount: totalAmount,
          ReferenceID: grn.GRNID,
          Date: receivedAt,
          PaymentMode: 'credit',
          Notes: `Direct Purchase GRN ${grnNumber}`,
          CreatedBy: receiverId
        }
      });

      // Also create a direct purchase invoice
      await prisma.purchaseInvoices.create({
        data: {
          POID: null,
          MerchantID: parseInt(MerchantID),
          InvoiceNo: `INV-${grnNumber}`,
          MerchantInvoiceNo: `BILL-${grnNumber}`,
          Amount: totalAmount,
          Status: 'unpaid',
          PaymentMode: 'credit',
          Date: receivedAt,
          CreatedBy: receiverId
        }
      });

      return grn;
    },

    createPurchaseReturn: async (_, { MerchantID, WarehouseID, Reason, Items }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      if (!MerchantID || !WarehouseID) throw new Error('Merchant and Warehouse are required');
      if (!Items || Items.length === 0) throw new Error('At least one item is required for return');

      const { store, shelf } = await getOrCreateFloorStoreAndShelf(WarehouseID);

      let totalAmount = 0;
      const returnItemsData = [];
      for (const item of Items) {
        const qty = parseInt(item.Qty || 1);
        const price = (item.Price !== undefined && item.Price !== null) ? parseFloat(item.Price) : 0;
        totalAmount += qty * price;

        returnItemsData.push({
          VariantID: parseInt(item.VariantID),
          Qty: qty,
          Price: price,
          Reason: item.Reason || Reason || 'Return to Vendor'
        });

        // Deduct stock from Floor store & FL01 shelf!
        await deductStockFromShelf(store.StoreID, shelf.ShelfID, parseInt(item.VariantID), qty);

        // Record stock movement
        const returnOfficerName = `${user.UserNameFirst || ''} ${user.UserNameLast || ''}`.trim() || 'Store Incharge';
        await prisma.stockMovements.create({
          data: {
            VariantID: parseInt(item.VariantID),
            FromStoreID: store.StoreID,
            ToStoreID: 0,
            FromShelf: shelf.ShelfCode || 'FL01',
            ToShelf: 'VENDOR_RETURN',
            Qty: qty,
            Type: 'PURCHASE_RETURN',
            Date: new Date(),
            CreatedBy: user.UserID,
            CreatedByName: returnOfficerName
          }
        });
      }

      const returnNo = `RET-${Date.now().toString().slice(-6)}`;
      const pr = await prisma.purchaseReturns.create({
        data: {
          ReturnNo: returnNo,
          MerchantID: parseInt(MerchantID),
          WarehouseID: parseInt(WarehouseID),
          TotalAmount: totalAmount,
          Reason: Reason || 'Purchase Return',
          Status: 'completed',
          CreatedBy: user.UserID,
          Items: { create: returnItemsData }
        },
        include: { Items: true }
      });

      // Post return credit to merchant ledger (reducing merchant balance)
      await prisma.merchantLedger.create({
        data: {
          MerchantID: parseInt(MerchantID),
          Type: 'RETURN',
          Amount: totalAmount,
          ReferenceID: pr.ReturnID,
          Date: new Date(),
          PaymentMode: 'credit',
          Notes: `Purchase Return ${returnNo}: ${Reason || ''}`,
          CreatedBy: user.UserID
        }
      });

      return pr;
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
  },
  GRN: {
    WarehouseName: async (parent) => {
      const w = await prisma.warehouses.findUnique({ where: { WarehouseID: parent.WarehouseID } });
      return w ? w.Name : 'N/A';
    },
    MerchantName: async (parent) => {
      const m = await prisma.merchants.findUnique({ where: { MerchantID: parent.MerchantID } });
      return m ? m.Name : 'N/A';
    },
    StoreName: async (parent) => {
      if (!parent.StoreID) return 'Floor Store';
      const s = await prisma.stores.findUnique({ where: { StoreID: parent.StoreID } });
      return s ? s.StoreName : 'Floor Store';
    },
    ShelfCode: async (parent) => {
      if (!parent.ShelfID) return 'FL01';
      const sh = await prisma.shelves.findUnique({ where: { ShelfID: parent.ShelfID } });
      return sh ? sh.ShelfCode : 'FL01';
    },
    PONumber: async (parent) => {
      if (!parent.POID) return null;
      return `PO-${String(parent.POID).padStart(5, '0')}`;
    },
    ReceivedAt: (parent) => parent.ReceivedAt ? parent.ReceivedAt.toISOString() : null,
    CreatedAt: (parent) => parent.CreatedAt ? parent.CreatedAt.toISOString() : null
  },
  GRNItem: {
    variant: async (parent) => {
      const v = await prisma.variants.findUnique({ where: { VariantID: parent.VariantID } });
      if (!v) return null;
      const product = await prisma.products.findUnique({ where: { ProductID: v.ProductID } });
      return { ...v, product };
    }
  },
  PurchaseReturn: {
    WarehouseName: async (parent) => {
      const w = await prisma.warehouses.findUnique({ where: { WarehouseID: parent.WarehouseID } });
      return w ? w.Name : 'N/A';
    },
    MerchantName: async (parent) => {
      const m = await prisma.merchants.findUnique({ where: { MerchantID: parent.MerchantID } });
      return m ? m.Name : 'N/A';
    },
    CreatedAt: (parent) => parent.CreatedAt ? parent.CreatedAt.toISOString() : null
  },
  PurchaseReturnItem: {
    VariantName: async (parent) => {
      const v = await prisma.variants.findUnique({ where: { VariantID: parent.VariantID } });
      if (!v) return 'Item';
      const p = await prisma.products.findUnique({ where: { ProductID: v.ProductID } });
      return p ? `${p.ProductName} (${v.Size || ''} ${v.Color || ''})` : (v.SKU || 'Item');
    },
    variant: async (parent) => {
      const v = await prisma.variants.findUnique({ where: { VariantID: parent.VariantID } });
      if (!v) return null;
      const product = await prisma.products.findUnique({ where: { ProductID: v.ProductID } });
      return { ...v, product };
    }
  }
};

module.exports = purchaseResolvers;
