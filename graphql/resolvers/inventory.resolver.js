const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const inventoryResolvers = {
  Query: {
    allStocks: async (_, { StoreID }) => {
      // Fetch all variants so we can show 0 stock for missing records
      const variants = await prisma.variants.findMany();
      const existingStocks = await prisma.stocks.findMany({
        where: { StoreID: parseInt(StoreID) }
      });

      // Map stocks to variants
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
    },
    stock: async (_, { StockID }) => {
      return await prisma.stocks.findUnique({
        where: { StockID: parseInt(StockID) },
        include: { variant: true }
      });
    }
  },
  Mutation: {
    updateStock: async (_, { StoreID, VariantID, OnHandQty, ReservedQty, ShelfID }) => {
      const resv = ReservedQty || 0;
      const avail = OnHandQty - resv;
      
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
            OnHandQty: parseInt(OnHandQty),
            ReservedQty: resv,
            AvailableQty: avail,
            ShelfID: ShelfID ? parseInt(ShelfID) : 1
          }
        });
      }
    }
  },
  Stock: {
    variant: async (parent) => {
      if (parent.variant) return parent.variant;
      return await prisma.variants.findUnique({ where: { VariantID: parent.VariantID } });
    },
    store: async (parent) => {
      return await prisma.stores.findUnique({ where: { StoreID: parent.StoreID } });
    }
  }
};

module.exports = inventoryResolvers;
