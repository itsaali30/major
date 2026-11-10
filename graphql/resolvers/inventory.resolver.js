const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const inventoryResolvers = {
  Query: {
    allStocks: async (_, { WarehouseID, StoreID }, { user }) => {
      // 1. Determine which stores to query
      let storeFilter = {};
      if (StoreID) {
        storeFilter = { StoreID: parseInt(StoreID) };
      } else if (WarehouseID) {
        const whStores = await prisma.stores.findMany({
          where: { WarehouseID: parseInt(WarehouseID) }
        });
        const storeIds = whStores.map(s => s.StoreID);
        storeFilter = { StoreID: { in: storeIds } };
      }

      // 2. Fetch existing stocks with positive or tracked quantities
      const existingStocks = await prisma.stocks.findMany({
        where: storeFilter,
        orderBy: [{ StoreID: 'asc' }, { StockID: 'asc' }]
      });

      // If specific StoreID was requested and no stocks exist yet, show variants with 0
      if (StoreID && existingStocks.length === 0) {
        const variants = await prisma.variants.findMany();
        return variants.map(v => ({
          StockID: 0,
          StoreID: parseInt(StoreID),
          VariantID: v.VariantID,
          ShelfID: v.ShelfID || null,
          OnHandQty: 0,
          ReservedQty: 0,
          AvailableQty: 0,
          variant: v
        }));
      }

      // If StoreID is provided, merge with all variants so all items appear
      if (StoreID) {
        const variants = await prisma.variants.findMany();
        return variants.map(v => {
          const s = existingStocks.find(stk => stk.VariantID === v.VariantID);
          return {
            StockID: s ? s.StockID : 0,
            StoreID: parseInt(StoreID),
            VariantID: v.VariantID,
            ShelfID: s ? s.ShelfID : v.ShelfID,
            OnHandQty: s ? (s.OnHandQty || 0) : 0,
            ReservedQty: s ? (s.ReservedQty || 0) : 0,
            AvailableQty: s ? (s.AvailableQty || 0) : 0,
            variant: v
          };
        });
      }

      // If querying by WarehouseID (or all), return all existing stock records
      // plus variants that have stock or belong to warehouse
      return existingStocks;
    },

    stock: async (_, { StockID }) => {
      return await prisma.stocks.findUnique({
        where: { StockID: parseInt(StockID) },
        include: { variant: true }
      });
    },

    variantLocations: async (_, { VariantID, WarehouseID }) => {
      const where = {
        VariantID: parseInt(VariantID),
        OnHandQty: { gt: 0 }
      };
      const stocks = await prisma.stocks.findMany({ where });

      const locations = [];
      for (const s of stocks) {
        const store = await prisma.stores.findUnique({
          where: { StoreID: s.StoreID },
          include: { Warehouse: true }
        });
        if (!store) continue;
        if (WarehouseID && store.WarehouseID !== parseInt(WarehouseID)) continue;

        let shelfCode = 'N/A';
        if (s.ShelfID) {
          const sh = await prisma.shelves.findUnique({ where: { ShelfID: s.ShelfID } });
          if (sh) shelfCode = sh.ShelfCode || 'N/A';
        }

        const isReturn = (store.Type || '').toLowerCase() === 'return' || (store.StoreName || '').toLowerCase().includes('return');
        locations.push({
          WarehouseID: store.WarehouseID,
          WarehouseName: store.Warehouse ? store.Warehouse.Name : 'N/A',
          StoreID: store.StoreID,
          StoreName: store.StoreName,
          StoreType: store.Type,
          ShelfID: s.ShelfID,
          ShelfCode: shelfCode,
          OnHandQty: s.OnHandQty || 0,
          AvailableQty: s.AvailableQty || 0,
          ReservedQty: s.ReservedQty || 0,
          IsReturnStore: isReturn
        });
      }
      return locations;
    },

    returnStoreInfo: async (_, { WarehouseID, VariantID }) => {
      const store = await prisma.stores.findFirst({
        where: {
          WarehouseID: parseInt(WarehouseID),
          OR: [
            { Type: { equals: 'Return', mode: 'insensitive' } },
            { StoreName: { contains: 'Return', mode: 'insensitive' } }
          ]
        },
        include: { Warehouse: true }
      });
      if (!store) return null;

      const shelf = await prisma.shelves.findFirst({
        where: { StoreID: store.StoreID }
      });

      let returnQty = 0;
      if (VariantID) {
        const stk = await prisma.stocks.findFirst({
          where: { StoreID: store.StoreID, VariantID: parseInt(VariantID) }
        });
        if (stk) returnQty = stk.OnHandQty || 0;
      }

      return {
        StoreID: store.StoreID,
        StoreName: store.StoreName,
        WarehouseID: store.WarehouseID,
        WarehouseName: store.Warehouse ? store.Warehouse.Name : 'N/A',
        ShelfID: shelf ? shelf.ShelfID : null,
        ShelfCode: shelf ? shelf.ShelfCode : 'RT01',
        ReturnStockQty: returnQty
      };
    }
  },

  Mutation: {
    updateStock: async (_, { StoreID, VariantID, OnHandQty, ReservedQty, ShelfID }) => {
      const resv = ReservedQty || 0;
      const avail = Math.max(0, OnHandQty - resv);
      
      const existing = await prisma.stocks.findFirst({
        where: { 
          StoreID: parseInt(StoreID),
          VariantID: parseInt(VariantID)
        }
      });

      if (existing) {
        return await prisma.stocks.update({
          where: { StockID: existing.StockID },
          data: {
            OnHandQty: parseInt(OnHandQty),
            ReservedQty: resv,
            AvailableQty: avail,
            ShelfID: ShelfID ? parseInt(ShelfID) : existing.ShelfID
          }
        });
      } else {
        return await prisma.stocks.create({
          data: {
            StoreID: parseInt(StoreID),
            VariantID: parseInt(VariantID),
            ShelfID: ShelfID ? parseInt(ShelfID) : 0,
            OnHandQty: parseInt(OnHandQty),
            ReservedQty: resv,
            AvailableQty: avail
          }
        });
      }
    },

    adjustStock: async (_, { StockID, Adjustment }) => {
      const current = await prisma.stocks.findUnique({
        where: { StockID: parseInt(StockID) }
      });
      if (!current) throw new Error('Stock record not found');
      
      const newOnHand = Math.max(0, (current.OnHandQty || 0) + parseInt(Adjustment));
      const resv = current.ReservedQty || 0;
      const newAvail = Math.max(0, newOnHand - resv);

      return await prisma.stocks.update({
        where: { StockID: parseInt(StockID) },
        data: {
          OnHandQty: newOnHand,
          AvailableQty: newAvail
        }
      });
    }
  },

  Stock: {
    variant: async (parent) => {
      if (parent.variant) return parent.variant;
      const v = await prisma.variants.findUnique({
        where: { VariantID: parent.VariantID }
      });
      if (!v) return null;
      const product = await prisma.products.findUnique({
        where: { ProductID: v.ProductID }
      });
      return { ...v, product };
    },
    store: async (parent) => {
      if (!parent.StoreID) return null;
      return await prisma.stores.findUnique({
        where: { StoreID: parent.StoreID },
        include: { Warehouse: true }
      });
    },
    WarehouseID: async (parent) => {
      if (parent.WarehouseID) return parent.WarehouseID;
      const s = await prisma.stores.findUnique({ where: { StoreID: parent.StoreID } });
      return s ? s.WarehouseID : null;
    },
    WarehouseName: async (parent) => {
      const s = await prisma.stores.findUnique({
        where: { StoreID: parent.StoreID },
        include: { Warehouse: true }
      });
      return s && s.Warehouse ? s.Warehouse.Name : 'N/A';
    },
    StoreName: async (parent) => {
      const s = await prisma.stores.findUnique({ where: { StoreID: parent.StoreID } });
      return s ? s.StoreName : 'N/A';
    },
    StoreType: async (parent) => {
      const s = await prisma.stores.findUnique({ where: { StoreID: parent.StoreID } });
      return s ? s.Type : 'N/A';
    },
    ShelfCode: async (parent) => {
      if (!parent.ShelfID) return 'N/A';
      const sh = await prisma.shelves.findUnique({ where: { ShelfID: parent.ShelfID } });
      return sh ? sh.ShelfCode : 'N/A';
    },
    ReturnStore: async (parent) => {
      const s = await prisma.stores.findUnique({ where: { StoreID: parent.StoreID } });
      if (!s) return null;
      const retStore = await prisma.stores.findFirst({
        where: {
          WarehouseID: s.WarehouseID,
          OR: [
            { Type: { equals: 'Return', mode: 'insensitive' } },
            { StoreName: { contains: 'Return', mode: 'insensitive' } }
          ]
        },
        include: { Warehouse: true }
      });
      if (!retStore) return null;
      const sh = await prisma.shelves.findFirst({ where: { StoreID: retStore.StoreID } });
      const retStock = await prisma.stocks.findFirst({
        where: { StoreID: retStore.StoreID, VariantID: parent.VariantID }
      });
      return {
        StoreID: retStore.StoreID,
        StoreName: retStore.StoreName,
        WarehouseID: retStore.WarehouseID,
        WarehouseName: retStore.Warehouse ? retStore.Warehouse.Name : 'N/A',
        ShelfID: sh ? sh.ShelfID : null,
        ShelfCode: sh ? sh.ShelfCode : 'RT01',
        ReturnStockQty: retStock ? (retStock.OnHandQty || 0) : 0
      };
    },
    AllLocations: async (parent) => {
      const allStks = await prisma.stocks.findMany({
        where: { VariantID: parent.VariantID, OnHandQty: { gt: 0 } }
      });
      const res = [];
      for (const stk of allStks) {
        const st = await prisma.stores.findUnique({
          where: { StoreID: stk.StoreID },
          include: { Warehouse: true }
        });
        if (!st) continue;
        let shCode = 'N/A';
        if (stk.ShelfID) {
          const sh = await prisma.shelves.findUnique({ where: { ShelfID: stk.ShelfID } });
          if (sh) shCode = sh.ShelfCode || 'N/A';
        }
        const isRet = (st.Type || '').toLowerCase() === 'return' || (st.StoreName || '').toLowerCase().includes('return');
        res.push({
          WarehouseID: st.WarehouseID,
          WarehouseName: st.Warehouse ? st.Warehouse.Name : 'N/A',
          StoreID: st.StoreID,
          StoreName: st.StoreName,
          StoreType: st.Type,
          ShelfID: stk.ShelfID,
          ShelfCode: shCode,
          OnHandQty: stk.OnHandQty || 0,
          AvailableQty: stk.AvailableQty || 0,
          ReservedQty: stk.ReservedQty || 0,
          IsReturnStore: isRet
        });
      }
      return res;
    },
    UnitCost: async (parent) => {
      const v = await prisma.variants.findUnique({ where: { VariantID: parent.VariantID } });
      if (v && v.Cost !== null && v.Cost !== undefined && v.Cost > 0) return v.Cost;

      // Lookup latest GRN Item cost
      const lastGRN = await prisma.gRNItems.findFirst({
        where: { VariantID: parent.VariantID },
        orderBy: { GRNItemID: 'desc' }
      });
      if (lastGRN && lastGRN.Cost) return lastGRN.Cost;

      // Lookup latest PO Item cost
      const lastPO = await prisma.purchaseOrderItems.findFirst({
        where: { VariantID: parent.VariantID },
        orderBy: { ItemID: 'desc' }
      });
      if (lastPO && lastPO.Cost) return lastPO.Cost;

      // Fallback based on SalePrice/MRP
      const sale = (v && v.SalePrice) ? v.SalePrice : (v && v.MRP ? parseFloat(v.MRP) : 50);
      return Math.round(sale * 0.75 * 100) / 100;
    },
    UnitSalePrice: async (parent) => {
      const v = await prisma.variants.findUnique({ where: { VariantID: parent.VariantID } });
      if (v && v.SalePrice) return v.SalePrice;
      if (v && v.MRP) {
        const mrpNum = parseFloat(v.MRP);
        if (!isNaN(mrpNum)) return mrpNum;
      }
      return 0;
    },
    CostValue: async (parent) => {
      const qty = parent.OnHandQty !== null && parent.OnHandQty !== undefined ? parent.OnHandQty : (parent.AvailableQty || 0);
      const v = await prisma.variants.findUnique({ where: { VariantID: parent.VariantID } });
      let cost = 0;
      if (v && v.Cost !== null && v.Cost !== undefined && v.Cost > 0) {
        cost = v.Cost;
      } else {
        const lastGRN = await prisma.gRNItems.findFirst({
          where: { VariantID: parent.VariantID },
          orderBy: { GRNItemID: 'desc' }
        });
        if (lastGRN && lastGRN.Cost) {
          cost = lastGRN.Cost;
        } else {
          const sale = (v && v.SalePrice) ? v.SalePrice : (v && v.MRP ? parseFloat(v.MRP) : 50);
          cost = Math.round(sale * 0.75 * 100) / 100;
        }
      }
      return Math.round(qty * cost * 100) / 100;
    },
    SaleValue: async (parent) => {
      const qty = parent.OnHandQty !== null && parent.OnHandQty !== undefined ? parent.OnHandQty : (parent.AvailableQty || 0);
      const v = await prisma.variants.findUnique({ where: { VariantID: parent.VariantID } });
      let sale = 0;
      if (v && v.SalePrice) sale = v.SalePrice;
      else if (v && v.MRP) {
        const mrpNum = parseFloat(v.MRP);
        if (!isNaN(mrpNum)) sale = mrpNum;
      }
      return Math.round(qty * sale * 100) / 100;
    },
    SoldQty: async (parent) => {
      try {
        const movements = await prisma.stockMovements.findMany({
          where: {
            VariantID: parent.VariantID,
            Type: { in: ['SALE', 'OUTBOUND', 'PICKING', 'sale', 'outbound', 'picking'] }
          }
        });
        return movements.reduce((acc, m) => acc + (m.Qty || 0), 0);
      } catch (e) {
        return 0;
      }
    }
  }
};

module.exports = inventoryResolvers;
