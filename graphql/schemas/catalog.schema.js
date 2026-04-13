const catalogSchema = `#graphql
  type Category {
    CategoryID: Int!
    CategoryName: String
    CategoryImageURL: String
    Status: String
    subCategories: [SubCategory]
  }

  type SubCategory {
    SubCategoryID: Int!
    CategoryID: Int!
    CategorySubName: String
    SubCategoryImageURL: String
    Status: String
    category: Category
    products: [Product]
  }

  type Brand {
    BrandID: Int!
    BrandName: String
    LogoURL: String
    Description: String
    Status: String
    products: [Product]
  }

  type Product {
    ProductID: Int!
    SubCategoryID: Int!
    BrandID: Int!
    ProductName: String
    ProductDescription: String
    ImageURL: String
    TaxRate: Float
    IsActive: Boolean
    CreatedAt: String
    subCategory: SubCategory
    brand: Brand
    variants: [Variant]
  }

  type Variant {
    VariantID: Int!
    ProductID: Int!
    SKU: String
    Weight: Float
    Size: String
    Color: String
    MRP: String
    SalePrice: Float
    ExpiryDate: String
    ValidDays: Int
    Status: String
    IsActive: Boolean
    ImageURL: String
    Unit: String
    ShelfID: Int
    CreatedAt: String
    product: Product
  }

  extend type Query {
    allCategories: [Category]
    allSubCategories(CategoryID: Int): [SubCategory]
    allBrands: [Brand]
    allProducts(SubCategoryID: Int, BrandID: Int): [Product]
    allVariants(ProductID: Int, SubCategoryID: Int, CategoryID: Int, BrandID: Int, Search: String): [Variant]
    
    category(CategoryID: Int!): Category
    subCategory(SubCategoryID: Int!): SubCategory
    brand(BrandID: Int!): Brand
    product(ProductID: Int!): Product
    variant(VariantID: Int!): Variant
  }

  extend type Mutation {
    # Category Mutations
    createCategory(CategoryName: String!, CategoryImageURL: String, Status: String): Category
    updateCategory(CategoryID: Int!, CategoryName: String, CategoryImageURL: String, Status: String): Category
    deleteCategory(CategoryID: Int!): Boolean

    # SubCategory Mutations
    createSubCategory(CategoryID: Int!, CategorySubName: String!, SubCategoryImageURL: String, Status: String): SubCategory
    updateSubCategory(SubCategoryID: Int!, CategorySubName: String, SubCategoryImageURL: String, Status: String): SubCategory
    deleteSubCategory(SubCategoryID: Int!): Boolean

    # Brand Mutations
    createBrand(BrandName: String!, LogoURL: String, Description: String, Status: String): Brand
    updateBrand(BrandID: Int!, BrandName: String, LogoURL: String, Description: String, Status: String): Brand
    deleteBrand(BrandID: Int!): Boolean

    # Product Mutations
    createProduct(SubCategoryID: Int!, BrandID: Int!, ProductName: String!, ProductDescription: String, ImageURL: String, TaxRate: Float, IsActive: Boolean): Product
    updateProduct(ProductID: Int!, ProductName: String, ProductDescription: String, ImageURL: String, TaxRate: Float, IsActive: Boolean): Product
    deleteProduct(ProductID: Int!): Boolean

    # Variant Mutations
    createVariant(
      ProductID: Int!, SKU: String, Weight: Float, Size: String, Color: String, 
      MRP: String, SalePrice: Float, ExpiryDate: String, ValidDays: Int, 
      Status: String, IsActive: Boolean, ImageURL: String, Unit: String, ShelfID: Int
    ): Variant
    updateVariant(
      VariantID: Int!, SKU: String, Weight: Float, Size: String, Color: String, 
      MRP: String, SalePrice: Float, ExpiryDate: String, ValidDays: Int, 
      Status: String, IsActive: Boolean, ImageURL: String, Unit: String, ShelfID: Int
    ): Variant
    deleteVariant(VariantID: Int!): Boolean
  }
`;

module.exports = catalogSchema;
