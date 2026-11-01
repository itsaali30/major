const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function buildShelfAudit(shelf) {
  if (!shelf) return null;

  const store = await prisma.stores.findUnique({
    where: { StoreID: shelf.StoreID },
    include: { Warehouse: true }
  });

  // 1. Current stock items on this shelf
  const stocks = await prisma.stocks.findMany({
    where: {
      StoreID: shelf.StoreID,
      ShelfID: shelf.ShelfID,
      OnHandQty: { gt: 0 }
    }
  });

  let totalUnits = 0;
  const items = [];
  for (const s of stocks) {
    totalUnits += (s.OnHandQty || 0);
    const v = await prisma.variants.findUnique({ where: { VariantID: s.VariantID } });
    const prod = v ? await prisma.products.findUnique({ where: { ProductID: v.ProductID } }) : null;
    items.push({
      VariantID: s.VariantID,
      ProductID: v ? v.ProductID : null,
      ProductName: prod ? prod.ProductName : 'Unknown Product',
      SKU: v ? v.SKU : '',
      Size: v ? v.Size : '',
      Color: v ? v.Color : '',
      Unit: v ? v.Unit : 'PCS',
      OnHandQty: s.OnHandQty || 0,
      AvailableQty: s.AvailableQty || 0,
      ReservedQty: s.ReservedQty || 0
    });
  }

  // 2. Receiving records (GRNs) for this shelf/store
  const grns = await prisma.gRNs.findMany({
    where: {
      StoreID: shelf.StoreID,
      OR: [
        { ShelfID: shelf.ShelfID },
        { ShelfID: null }
      ]
    },
    include: { Items: true },
    orderBy: { CreatedAt: 'desc' },
    take: 50
  });

  const receivings = [];
  for (const g of grns) {
    const merchant = await prisma.merchants.findUnique({ where: { MerchantID: g.MerchantID } });
    const merchantName = merchant ? merchant.Name : 'Vendor';
    for (const it of (g.Items || [])) {
      const v = await prisma.variants.findUnique({ where: { VariantID: it.VariantID } });
      receivings.push({
        GRNID: g.GRNID,
        GRNNumber: g.GRNNumber || `GRN-${g.GRNID}`,
        Type: g.Type || 'PO',
        VariantID: it.VariantID,
        VariantName: it.VariantName,
        SKU: v ? v.SKU : '',
        Qty: it.Qty,
        Cost: it.Cost,
        ReceivedByID: g.ReceivedByID,
        ReceivedByName: g.ReceivedByName || 'Officer',
        ReceivedAt: g.ReceivedAt ? g.ReceivedAt.toISOString() : (g.CreatedAt ? g.CreatedAt.toISOString() : null),
        MerchantName: merchantName,
        Remarks: g.Remarks
      });
    }
  }

  // 3. Movement / Transfer records for this shelf
  const shelfCode = shelf.ShelfCode || 'FL01';
  const movements = await prisma.stockMovements.findMany({
    where: {
      OR: [
        { ToShelf: shelfCode, ToStoreID: shelf.StoreID },
        { FromShelf: shelfCode, FromStoreID: shelf.StoreID },
        { ToShelf: shelfCode },
        { FromShelf: shelfCode }
      ]
    },
    orderBy: { Date: 'desc' },
    take: 50
  });

  const movementRecords = [];
  for (const m of movements) {
    const v = await prisma.variants.findUnique({ where: { VariantID: m.VariantID } });
    const prod = v ? await prisma.products.findUnique({ where: { ProductID: v.ProductID } }) : null;
    const fromStore = m.FromStoreID ? await prisma.stores.findUnique({ where: { StoreID: m.FromStoreID } }) : null;
    const toStore = m.ToStoreID ? await prisma.stores.findUnique({ where: { StoreID: m.ToStoreID } }) : null;

    let fromName = fromStore ? fromStore.StoreName : (m.FromShelf === 'VENDOR' || m.FromShelf === 'VENDOR_DIRECT' ? 'Vendor / Inward Supply' : 'External');
    let toName = toStore ? toStore.StoreName : (m.ToShelf === 'VENDOR_RETURN' ? 'Vendor Return' : 'External');

    movementRecords.push({
      MovementID: m.MovementID,
      VariantID: m.VariantID,
      VariantName: prod ? `${prod.ProductName} (${v.Size || ''} ${v.Color || ''})`.trim() : (v ? v.SKU : 'Item'),
      SKU: v ? v.SKU : '',
      FromStoreID: m.FromStoreID,
      FromStoreName: fromName,
      ToStoreID: m.ToStoreID,
      ToStoreName: toName,
      FromShelf: m.FromShelf || 'N/A',
      ToShelf: m.ToShelf || 'N/A',
      Qty: m.Qty || 0,
      Type: m.Type || 'TRANSFER',
      Date: m.Date ? m.Date.toISOString() : null,
      CreatedBy: m.CreatedBy,
      CreatedByName: m.CreatedByName || (m.CreatedBy ? `Staff #${m.CreatedBy}` : 'Officer')
    });
  }

  return {
    ShelfID: shelf.ShelfID,
    ShelfCode: shelf.ShelfCode,
    StoreID: shelf.StoreID,
    StoreName: store ? store.StoreName : 'Store',
    StoreType: store ? store.Type : 'Standard',
    WarehouseID: store ? store.WarehouseID : null,
    WarehouseName: store && store.Warehouse ? store.Warehouse.Name : 'Warehouse',
    TotalItemsCount: items.length,
    TotalUnits: totalUnits,
    Items: items,
    Receivings: receivings,
    Movements: movementRecords
  };
}

const resolvers = {
  Query: {
    allShelves: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await prisma.shelves.findMany({
        orderBy: { ShelfID: 'desc' }
      });
    },
    shelvesByStore: async (_, { StoreID }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await prisma.shelves.findMany({
        where: { StoreID: parseInt(StoreID) },
        orderBy: { ShelfID: 'asc' }
      });
    },
    shelf: async (_, { ShelfID }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await prisma.shelves.findUnique({
        where: { ShelfID: parseInt(ShelfID) }
      });
    },
    shelfAuditDetails: async (_, { ShelfID }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const shelf = await prisma.shelves.findUnique({ where: { ShelfID: parseInt(ShelfID) } });
      return await buildShelfAudit(shelf);
    },
    storeShelvesWithAudit: async (_, { StoreID }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const shelves = await prisma.shelves.findMany({
        where: { StoreID: parseInt(StoreID) },
        orderBy: { ShelfID: 'asc' }
      });
      const results = [];
      for (const sh of shelves) {
        results.push(await buildShelfAudit(sh));
      }
      return results;
    }
  },
  Mutation: {
    createShelf: async (_, args, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const isAuthorized = ['superadmin', 'admin', 'manager', 'incharge'].includes(user.Role);
      if (!isAuthorized) throw new Error('Not authorized');
      
      const data = {
        StoreID: parseInt(args.StoreID),
        ShelfCode: args.ShelfCode ? String(args.ShelfCode).trim() : null,
        Level: args.Level !== undefined && args.Level !== null && !isNaN(args.Level) ? parseInt(args.Level) : 1,
        Position: args.Position !== undefined && args.Position !== null && !isNaN(args.Position) ? parseInt(args.Position) : 1
      };

      return await prisma.shelves.create({
        data
      });
    },
    updateShelf: async (_, args, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const isAuthorized = ['superadmin', 'admin', 'manager', 'incharge'].includes(user.Role);
      if (!isAuthorized) throw new Error('Not authorized');

      const { ShelfID, ...updateData } = args;
      const data = {};
      if (updateData.ShelfCode !== undefined) data.ShelfCode = updateData.ShelfCode ? String(updateData.ShelfCode).trim() : null;
      if (updateData.Level !== undefined && updateData.Level !== null && !isNaN(updateData.Level)) data.Level = parseInt(updateData.Level);
      if (updateData.Position !== undefined && updateData.Position !== null && !isNaN(updateData.Position)) data.Position = parseInt(updateData.Position);
      if (updateData.StoreID !== undefined && updateData.StoreID !== null && !isNaN(updateData.StoreID)) data.StoreID = parseInt(updateData.StoreID);

      return await prisma.shelves.update({
        where: { ShelfID: parseInt(ShelfID) },
        data
      });
    },
    deleteShelf: async (_, { ShelfID }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const isAuthorized = ['superadmin', 'admin', 'manager'].includes(user.Role);
      if (!isAuthorized) throw new Error('Not authorized');

      await prisma.shelves.delete({
        where: { ShelfID: parseInt(ShelfID) }
      });
      return true;
    }
  },
  Shelves: {
    Store: async (parent) => {
      return await prisma.stores.findUnique({
        where: { StoreID: parent.StoreID },
        include: { Warehouse: true }
      });
    },
    TotalItemsCount: async (parent) => {
      const count = await prisma.stocks.count({
        where: { ShelfID: parent.ShelfID, StoreID: parent.StoreID, OnHandQty: { gt: 0 } }
      });
      return count;
    },
    TotalUnits: async (parent) => {
      const agg = await prisma.stocks.aggregate({
        where: { ShelfID: parent.ShelfID, StoreID: parent.StoreID },
        _sum: { OnHandQty: true }
      });
      return agg._sum.OnHandQty || 0;
    }
  }
};

module.exports = resolvers;
