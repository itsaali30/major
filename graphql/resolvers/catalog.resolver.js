const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const catalogResolvers = {
  Query: {
    // Categories
    allCategories: async () => {
      return await prisma.categories.findMany({
        orderBy: { CategoryID: 'asc' }
      });
    },
    category: async (_, { CategoryID }) => {
      return await prisma.categories.findUnique({
        where: { CategoryID: parseInt(CategoryID) }
      });
    },

    // SubCategories
    allSubCategories: async (_, { CategoryID }) => {
      const where = CategoryID ? { CategoryID: parseInt(CategoryID) } : {};
      return await prisma.subCategories.findMany({
        where,
        orderBy: { SubCategoryID: 'asc' }
      });
    },
    subCategory: async (_, { SubCategoryID }) => {
      return await prisma.subCategories.findUnique({
        where: { SubCategoryID: parseInt(SubCategoryID) }
      });
    },

    // Brands
    allBrands: async () => {
      return await prisma.brands.findMany({
        orderBy: { BrandID: 'asc' }
      });
    },
    brand: async (_, { BrandID }) => {
      return await prisma.brands.findUnique({
        where: { BrandID: parseInt(BrandID) }
      });
    },

    // Products
    allProducts: async (_, { SubCategoryID, BrandID }) => {
      const where = {};
      if (SubCategoryID) where.SubCategoryID = parseInt(SubCategoryID);
      if (BrandID) where.BrandID = parseInt(BrandID);
      return await prisma.products.findMany({
        where,
        orderBy: { ProductID: 'asc' }
      });
    },
    product: async (_, { ProductID }) => {
      return await prisma.products.findUnique({
        where: { ProductID: parseInt(ProductID) }
      });
    },

    // Variants
    allVariants: async (_, { ProductID, SubCategoryID, CategoryID, BrandID, Search }) => {
      let productIdsFromFilters = null;

      // 1. Get products that match the CATEGORY / SUBCATEGORY / BRAND filters
      if (SubCategoryID || CategoryID || BrandID) {
        const productWhere = {};
        if (SubCategoryID) productWhere.SubCategoryID = parseInt(SubCategoryID);
        if (BrandID) productWhere.BrandID = parseInt(BrandID);
        
        if (CategoryID) {
          const subCats = await prisma.subCategories.findMany({
            where: { CategoryID: parseInt(CategoryID) },
            select: { SubCategoryID: true }
          });
          const scIds = subCats.map(sc => sc.SubCategoryID);
          if (SubCategoryID) {
             if (!scIds.includes(parseInt(SubCategoryID))) return []; 
          } else {
             productWhere.SubCategoryID = { in: scIds };
          }
        }

        const filteredProducts = await prisma.products.findMany({
          where: productWhere,
          select: { ProductID: true }
        });
        productIdsFromFilters = filteredProducts.map(p => p.ProductID);
      }

      // 2. Build the Variant filter
      const variantWhere = {};
      
      // Handle the ProductID filter directly if provided
      if (ProductID) {
        variantWhere.ProductID = parseInt(ProductID);
      } else if (productIdsFromFilters !== null) {
        variantWhere.ProductID = { in: productIdsFromFilters };
      }

      // 3. Handle SEARCH (Applying to either ProductName OR SKU)
      if (Search && Search.trim()) {
        const s = Search.trim();
        const searchProductWhere = { ProductName: { contains: s, mode: 'insensitive' } };
        
        if (productIdsFromFilters !== null) {
          searchProductWhere.ProductID = { in: productIdsFromFilters };
        }

        const matchedProducts = await prisma.products.findMany({
          where: searchProductWhere,
          select: { ProductID: true }
        });
        const productIdsMatchingName = matchedProducts.map(p => p.ProductID);

        variantWhere.OR = [
          { SKU: { contains: s, mode: 'insensitive' } },
          { ProductID: { in: productIdsMatchingName } },
          { Color: { contains: s, mode: 'insensitive' } },
          { Size: { contains: s, mode: 'insensitive' } }
        ];

        if (!isNaN(parseInt(s))) {
          variantWhere.OR.push({ VariantID: parseInt(s) });
        }
      }

      return await prisma.variants.findMany({
        where: variantWhere,
        orderBy: { VariantID: 'asc' }
      });
    },
    variant: async (_, { VariantID }) => {
      return await prisma.variants.findUnique({
        where: { VariantID: parseInt(VariantID) }
      });
    }
  },
  Mutation: {
    // Category CRUD
    createCategory: async (_, args) => {
      return await prisma.categories.create({ data: args });
    },
    updateCategory: async (_, { CategoryID, ...data }) => {
      return await prisma.categories.update({
        where: { CategoryID: parseInt(CategoryID) },
        data: data
      });
    },
    deleteCategory: async (_, { CategoryID }) => {
      const cid = parseInt(CategoryID);
      const subCats = await prisma.subCategories.findMany({ where: { CategoryID: cid }, select: { SubCategoryID: true } });
      const scIds = subCats.map(sc => sc.SubCategoryID);
      if (scIds.length > 0) {
        const prods = await prisma.products.findMany({ where: { SubCategoryID: { in: scIds } }, select: { ProductID: true } });
        const prodIds = prods.map(p => p.ProductID);
        if (prodIds.length > 0) {
          const vars = await prisma.variants.findMany({ where: { ProductID: { in: prodIds } }, select: { VariantID: true } });
          const varIds = vars.map(v => v.VariantID);
          if (varIds.length > 0) {
            await prisma.stocks.deleteMany({ where: { VariantID: { in: varIds } } });
            await prisma.variants.deleteMany({ where: { ProductID: { in: prodIds } } });
          }
          await prisma.products.deleteMany({ where: { SubCategoryID: { in: scIds } } });
        }
        await prisma.subCategories.deleteMany({ where: { CategoryID: cid } });
      }
      await prisma.categories.delete({ where: { CategoryID: cid } });
      return true;
    },

    // SubCategory CRUD
    createSubCategory: async (_, args) => {
      const data = { ...args };
      data.CategoryID = parseInt(data.CategoryID);
      return await prisma.subCategories.create({ data });
    },
    updateSubCategory: async (_, { SubCategoryID, ...data }) => {
      const updateData = { ...data };
      if (updateData.CategoryID) updateData.CategoryID = parseInt(updateData.CategoryID);
      return await prisma.subCategories.update({
        where: { SubCategoryID: parseInt(SubCategoryID) },
        data: updateData
      });
    },
    deleteSubCategory: async (_, { SubCategoryID }) => {
      const scid = parseInt(SubCategoryID);
      const prods = await prisma.products.findMany({ where: { SubCategoryID: scid }, select: { ProductID: true } });
      const prodIds = prods.map(p => p.ProductID);
      if (prodIds.length > 0) {
        const vars = await prisma.variants.findMany({ where: { ProductID: { in: prodIds } }, select: { VariantID: true } });
        const varIds = vars.map(v => v.VariantID);
        if (varIds.length > 0) {
          await prisma.stocks.deleteMany({ where: { VariantID: { in: varIds } } });
          await prisma.variants.deleteMany({ where: { ProductID: { in: prodIds } } });
        }
        await prisma.products.deleteMany({ where: { SubCategoryID: scid } });
      }
      await prisma.subCategories.delete({ where: { SubCategoryID: scid } });
      return true;
    },

    // Brand CRUD
    createBrand: async (_, args) => {
      return await prisma.brands.create({ data: args });
    },
    updateBrand: async (_, { BrandID, ...data }) => {
      return await prisma.brands.update({
        where: { BrandID: parseInt(BrandID) },
        data: data
      });
    },
    deleteBrand: async (_, { BrandID }) => {
      const bid = parseInt(BrandID);
      const prods = await prisma.products.findMany({ where: { BrandID: bid }, select: { ProductID: true } });
      const prodIds = prods.map(p => p.ProductID);
      if (prodIds.length > 0) {
        const vars = await prisma.variants.findMany({ where: { ProductID: { in: prodIds } }, select: { VariantID: true } });
        const varIds = vars.map(v => v.VariantID);
        if (varIds.length > 0) {
          await prisma.stocks.deleteMany({ where: { VariantID: { in: varIds } } });
          await prisma.variants.deleteMany({ where: { ProductID: { in: prodIds } } });
        }
        await prisma.products.deleteMany({ where: { BrandID: bid } });
      }
      await prisma.brands.delete({ where: { BrandID: bid } });
      return true;
    },

    // Product CRUD
    createProduct: async (_, args) => {
      const data = { ...args };
      data.SubCategoryID = parseInt(data.SubCategoryID);
      data.BrandID = parseInt(data.BrandID);
      if (data.TaxRate !== undefined && data.TaxRate !== null && data.TaxRate !== '') {
        data.TaxRate = parseFloat(data.TaxRate);
      } else {
        delete data.TaxRate;
      }
      return await prisma.products.create({ data });
    },
    updateProduct: async (_, { ProductID, ...data }) => {
      const updateData = { ...data };
      if (updateData.SubCategoryID) updateData.SubCategoryID = parseInt(updateData.SubCategoryID);
      if (updateData.BrandID) updateData.BrandID = parseInt(updateData.BrandID);
      if (updateData.TaxRate !== undefined && updateData.TaxRate !== null && updateData.TaxRate !== '') {
        updateData.TaxRate = parseFloat(updateData.TaxRate);
      }
      return await prisma.products.update({
        where: { ProductID: parseInt(ProductID) },
        data: updateData
      });
    },
    deleteProduct: async (_, { ProductID }) => {
      const pid = parseInt(ProductID);
      const vars = await prisma.variants.findMany({ where: { ProductID: pid }, select: { VariantID: true } });
      const varIds = vars.map(v => v.VariantID);
      if (varIds.length > 0) {
        await prisma.stocks.deleteMany({ where: { VariantID: { in: varIds } } });
        await prisma.variants.deleteMany({ where: { ProductID: pid } });
      }
      await prisma.products.delete({ where: { ProductID: pid } });
      return true;
    },

    // Variant CRUD
    createVariant: async (_, args) => {
      const data = { ...args };
      data.ProductID = parseInt(data.ProductID);
      if (!data.ShelfID) {
        const firstShelf = await prisma.shelves.findFirst();
        data.ShelfID = firstShelf ? firstShelf.ShelfID : 1;
      } else {
        data.ShelfID = parseInt(data.ShelfID);
      }
      if (data.Weight !== undefined && data.Weight !== null && data.Weight !== '') {
        data.Weight = parseFloat(data.Weight);
      }
      if (data.SalePrice !== undefined && data.SalePrice !== null && data.SalePrice !== '') {
        data.SalePrice = parseFloat(data.SalePrice);
      }
      if (data.MRP !== undefined && data.MRP !== null) {
        data.MRP = String(data.MRP);
      }
      if (data.ExpiryDate) data.ExpiryDate = new Date(data.ExpiryDate);
      const variant = await prisma.variants.create({ data });
      try {
        const store = await prisma.stores.findFirst();
        if (store) {
          await prisma.stocks.create({
            data: {
              StoreID: store.StoreID,
              VariantID: variant.VariantID,
              ShelfID: variant.ShelfID,
              OnHandQty: 0,
              ReservedQty: 0,
              AvailableQty: 0
            }
          });
        }
      } catch (e) {
        console.warn('Initial stock create error:', e.message);
      }
      return variant;
    },
    updateVariant: async (_, { VariantID, ...data }) => {
      const updateData = { ...data };
      if (updateData.ExpiryDate) updateData.ExpiryDate = new Date(updateData.ExpiryDate);
      if (updateData.ShelfID) updateData.ShelfID = parseInt(updateData.ShelfID);
      if (updateData.Weight !== undefined && updateData.Weight !== null && updateData.Weight !== '') {
        updateData.Weight = parseFloat(updateData.Weight);
      }
      if (updateData.SalePrice !== undefined && updateData.SalePrice !== null && updateData.SalePrice !== '') {
        updateData.SalePrice = parseFloat(updateData.SalePrice);
      }
      if (updateData.MRP !== undefined && updateData.MRP !== null) {
        updateData.MRP = String(updateData.MRP);
      }
      return await prisma.variants.update({
        where: { VariantID: parseInt(VariantID) },
        data: updateData
      });
    },
    deleteVariant: async (_, { VariantID }) => {
      const vid = parseInt(VariantID);
      await prisma.stocks.deleteMany({ where: { VariantID: vid } });
      await prisma.variants.delete({ where: { VariantID: vid } });
      return true;
    }
  },
  Category: {
    subCategories: async (parent) => {
      return await prisma.subCategories.findMany({ where: { CategoryID: parent.CategoryID } });
    }
  },
  SubCategory: {
    category: async (parent) => {
      return await prisma.categories.findUnique({ where: { CategoryID: parent.CategoryID } });
    },
    products: async (parent) => {
      return await prisma.products.findMany({ where: { SubCategoryID: parent.SubCategoryID } });
    }
  },
  Brand: {
    products: async (parent) => {
      return await prisma.products.findMany({ where: { BrandID: parent.BrandID } });
    }
  },
  Product: {
    subCategory: async (parent) => {
      return await prisma.subCategories.findUnique({ where: { SubCategoryID: parent.SubCategoryID } });
    },
    brand: async (parent) => {
      return await prisma.brands.findUnique({ where: { BrandID: parent.BrandID } });
    },
    variants: async (parent) => {
      return await prisma.variants.findMany({ where: { ProductID: parent.ProductID } });
    },
    CreatedAt: (parent) => parent.CreatedAt ? new Date(parent.CreatedAt).toISOString() : null
  },
  Variant: {
    product: async (parent) => {
      return await prisma.products.findUnique({ where: { ProductID: parent.ProductID } });
    },
    CreatedAt: (parent) => parent.CreatedAt ? new Date(parent.CreatedAt).toISOString() : null,
    ExpiryDate: (parent) => parent.ExpiryDate ? new Date(parent.ExpiryDate).toISOString() : null
  }
};

module.exports = catalogResolvers;
