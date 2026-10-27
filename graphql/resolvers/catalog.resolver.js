const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const catalogResolvers = {
  Query: {
    allCategories: async () => {
      return await prisma.categories.findMany({
        orderBy: { CategoryID: 'asc' }
      });
    },
    allSubCategories: async (_, { CategoryID }) => {
      const where = CategoryID ? { CategoryID: parseInt(CategoryID) } : {};
      return await prisma.subCategories.findMany({
        where,
        orderBy: { SubCategoryID: 'asc' }
      });
    },
    allBrands: async () => {
      return await prisma.brands.findMany({
        orderBy: { BrandID: 'asc' }
      });
    },
    allProducts: async (_, { SubCategoryID, BrandID }) => {
      const where = {};
      if (SubCategoryID) where.SubCategoryID = parseInt(SubCategoryID);
      if (BrandID) where.BrandID = parseInt(BrandID);
      
      return await prisma.products.findMany({
        where,
        orderBy: { ProductID: 'asc' }
      });
    },
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
        // If we have category/brand filters, the variants MUST belong to those products
        variantWhere.ProductID = { in: productIdsFromFilters };
      }

      // 3. Handle SEARCH (Applying to either ProductName OR SKU)
      if (Search) {
        // Find products whose names match the search
        const searchProductWhere = { ProductName: { contains: Search, mode: 'insensitive' } };
        
        // If we already have product filters, the search must also respect them
        if (productIdsFromFilters !== null) {
           searchProductWhere.ProductID = { in: productIdsFromFilters };
        }

        const matchedProducts = await prisma.products.findMany({
          where: searchProductWhere,
          select: { ProductID: true }
        });
        const productIdsMatchingName = matchedProducts.map(p => p.ProductID);

        // Combine Name Search (Product) and SKU Search (Variant)
        variantWhere.OR = [
          { SKU: { contains: Search, mode: 'insensitive' } },
          { ProductID: { in: productIdsMatchingName } },
          { Color: { contains: Search, mode: 'insensitive' } },
          { Size: { contains: Search, mode: 'insensitive' } }
        ];

        // Also allow VariantID search if numeric
        if (!isNaN(parseInt(Search))) {
          variantWhere.OR.push({ VariantID: parseInt(Search) });
        }
      }

      return await prisma.variants.findMany({
        where: variantWhere,
        orderBy: { VariantID: 'asc' }
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
      await prisma.categories.delete({ where: { CategoryID: parseInt(CategoryID) } });
      return true;
    },

    // SubCategory CRUD
    createSubCategory: async (_, args) => {
      const data = { ...args };
      data.CategoryID = parseInt(data.CategoryID);
      return await prisma.subCategories.create({ data });
    },
    updateSubCategory: async (_, { SubCategoryID, ...data }) => {
      return await prisma.subCategories.update({
        where: { SubCategoryID: parseInt(SubCategoryID) },
        data: data
      });
    },
    deleteSubCategory: async (_, { SubCategoryID }) => {
      await prisma.subCategories.delete({ where: { SubCategoryID: parseInt(SubCategoryID) } });
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
      await prisma.brands.delete({ where: { BrandID: parseInt(BrandID) } });
      return true;
    },

    // Product CRUD
    createProduct: async (_, args) => {
      const data = { ...args };
      data.SubCategoryID = parseInt(data.SubCategoryID);
      data.BrandID = parseInt(data.BrandID);
      return await prisma.products.create({ data });
    },
    updateProduct: async (_, { ProductID, ...data }) => {
      return await prisma.products.update({
        where: { ProductID: parseInt(ProductID) },
        data: data
      });
    },
    deleteProduct: async (_, { ProductID }) => {
      await prisma.variants.deleteMany({ where: { ProductID: parseInt(ProductID) } });
      await prisma.products.delete({ where: { ProductID: parseInt(ProductID) } });
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
      return await prisma.variants.update({
        where: { VariantID: parseInt(VariantID) },
        data: updateData
      });
    },
    deleteVariant: async (_, { VariantID }) => {
      await prisma.variants.delete({ where: { VariantID: parseInt(VariantID) } });
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
    }
  },
  Variant: {
    product: async (parent) => {
      return await prisma.products.findUnique({ where: { ProductID: parent.ProductID } });
    }
  }
};

module.exports = catalogResolvers;
