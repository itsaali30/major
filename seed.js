const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Roles
  const rolesData = [
    { RoleName: 'superadmin', Permissions: 'ALL' },
    { RoleName: 'admin', Permissions: 'ALL_STORE' },
    { RoleName: 'manager', Permissions: 'MANAGE_STORE' },
    { RoleName: 'picker', Permissions: 'PICK_ITEMS' },
    { RoleName: 'packer', Permissions: 'PACK_ITEMS' },
    { RoleName: 'rider', Permissions: 'DELIVER_ORDERS' },
    { RoleName: 'customer', Permissions: 'CUSTOMER_PORTAL' }
  ];

  for (const role of rolesData) {
    await prisma.roles.create({ data: role });
  }
  console.log('✅ Roles created');

  // 2. Users (Superadmin, Manager, Rider, Customer)
  const defaultPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('password123', 10);

  const users = [
    {
      UserNameFirst: 'Super',
      UserNameLast: 'Admin',
      Gender: 'Male',
      Mobile: '9999999999',
      Email: 'admin@zepto.local',
      Password: defaultPassword,
      Role: 'superadmin',
      IsActive: true,
      IsApproved: true,
      IsOnline: true
    },
    {
      UserNameFirst: 'Rahul',
      UserNameLast: 'Sharma',
      Gender: 'Male',
      Mobile: '9888888888',
      Email: 'manager@zepto.local',
      Password: userPassword,
      Role: 'manager',
      IsActive: true,
      IsApproved: true,
      IsOnline: false
    },
    {
      UserNameFirst: 'Amit',
      UserNameLast: 'Kumar',
      Gender: 'Male',
      Mobile: '9777777777',
      Email: 'picker@zepto.local',
      Password: userPassword,
      Role: 'picker',
      IsActive: true,
      IsApproved: true,
      IsOnline: false
    },
    {
      UserNameFirst: 'Suresh',
      UserNameLast: 'Patel',
      Gender: 'Male',
      Mobile: '9666666666',
      Email: 'rider@zepto.local',
      Password: userPassword,
      Role: 'rider',
      IsActive: true,
      IsApproved: true,
      IsOnline: true
    },
    {
      UserNameFirst: 'Priya',
      UserNameLast: 'Singh',
      Gender: 'Female',
      Mobile: '9555555555',
      Email: 'customer@zepto.local',
      Password: userPassword,
      Role: 'customer',
      IsActive: true,
      IsApproved: true,
      IsOnline: true
    }
  ];

  const createdUsers = [];
  for (const u of users) {
    const created = await prisma.users.upsert({
      where: { Email: u.Email },
      update: {},
      create: u
    });
    createdUsers.push(created);
  }
  console.log(`✅ ${createdUsers.length} Users seeded`);

  // 3. Warehouses
  const warehouses = [
    {
      Name: 'Bengaluru Central Distribution Hub',
      Address: 'Plot 45, Peenya Industrial Area, Bengaluru, Karnataka',
      Lat: 13.0285,
      Long: 77.5197,
      Contact: '+91 80 2345 6789',
      Type: 'Central Hub',
      Status: 'Active'
    },
    {
      Name: 'Mumbai West Logistics Warehouse',
      Address: 'Gala 12, Bhiwandi Logistics Park, Mumbai, Maharashtra',
      Lat: 19.2967,
      Long: 73.0631,
      Contact: '+91 22 8765 4321',
      Type: 'Regional Hub',
      Status: 'Active'
    }
  ];

  const createdWarehouses = [];
  for (const w of warehouses) {
    const created = await prisma.warehouses.create({ data: w });
    createdWarehouses.push(created);
  }
  console.log(`✅ ${createdWarehouses.length} Warehouses seeded`);

  // 4. Stores (Dark Stores for 10-minute delivery)
  const stores = [
    {
      WarehouseID: createdWarehouses[0].WarehouseID,
      StoreName: 'Zepto Dark Store - Koramangala 4th Block',
      Address: '80ft Road, Koramangala 4th Block, Bengaluru',
      Lat: 12.9345,
      Long: 77.6265,
      Type: 'Dark Store',
      Status: 'Active'
    },
    {
      WarehouseID: createdWarehouses[0].WarehouseID,
      StoreName: 'Zepto Dark Store - Indiranagar 100ft Rd',
      Address: '100ft Road, HAL 2nd Stage, Indiranagar, Bengaluru',
      Lat: 12.9719,
      Long: 77.6412,
      Type: 'Dark Store',
      Status: 'Active'
    },
    {
      WarehouseID: createdWarehouses[1].WarehouseID,
      StoreName: 'Zepto Dark Store - Andheri West Lokhandwala',
      Address: 'Lokhandwala Complex, Andheri West, Mumbai',
      Lat: 19.1417,
      Long: 72.8258,
      Type: 'Dark Store',
      Status: 'Active'
    }
  ];

  const createdStores = [];
  for (const s of stores) {
    const created = await prisma.stores.create({ data: s });
    createdStores.push(created);
  }
  console.log(`✅ ${createdStores.length} Dark Stores seeded`);

  // 5. Shelves
  const shelves = [
    { StoreID: createdStores[0].StoreID, ShelfCode: 'A1-DAIRY-01', Level: 1, Position: 1 },
    { StoreID: createdStores[0].StoreID, ShelfCode: 'A1-DAIRY-02', Level: 1, Position: 2 },
    { StoreID: createdStores[0].StoreID, ShelfCode: 'B1-SNACKS-01', Level: 2, Position: 1 },
    { StoreID: createdStores[0].StoreID, ShelfCode: 'B1-SNACKS-02', Level: 2, Position: 2 },
    { StoreID: createdStores[0].StoreID, ShelfCode: 'C1-BEV-01', Level: 3, Position: 1 },
    { StoreID: createdStores[0].StoreID, ShelfCode: 'D1-FRUITS-01', Level: 1, Position: 1 }
  ];

  const createdShelves = [];
  for (const sh of shelves) {
    const created = await prisma.shelves.create({ data: sh });
    createdShelves.push(created);
  }
  console.log(`✅ ${createdShelves.length} Shelves seeded`);

  // 6. Categories & SubCategories
  const categoriesData = [
    { CategoryName: 'Dairy, Bread & Eggs', Status: 'Active', CategoryImageURL: 'http://localhost:9000/product-images/cat-dairy.png' },
    { CategoryName: 'Snacks & Munchies', Status: 'Active', CategoryImageURL: 'http://localhost:9000/product-images/cat-snacks.png' },
    { CategoryName: 'Cold Drinks & Juices', Status: 'Active', CategoryImageURL: 'http://localhost:9000/product-images/cat-drinks.png' },
    { CategoryName: 'Fruits & Vegetables', Status: 'Active', CategoryImageURL: 'http://localhost:9000/product-images/cat-fruits.png' }
  ];

  const createdCategories = [];
  for (const cat of categoriesData) {
    const created = await prisma.categories.create({ data: cat });
    createdCategories.push(created);
  }
  console.log(`✅ ${createdCategories.length} Categories seeded`);

  const subCategoriesData = [
    { CategoryID: createdCategories[0].CategoryID, CategorySubName: 'Milk & Curd', Status: 'Active' },
    { CategoryID: createdCategories[0].CategoryID, CategorySubName: 'Butter & Cheese', Status: 'Active' },
    { CategoryID: createdCategories[1].CategoryID, CategorySubName: 'Chips & Crisps', Status: 'Active' },
    { CategoryID: createdCategories[1].CategoryID, CategorySubName: 'Biscuits & Cookies', Status: 'Active' },
    { CategoryID: createdCategories[2].CategoryID, CategorySubName: 'Soft Drinks', Status: 'Active' },
    { CategoryID: createdCategories[2].CategoryID, CategorySubName: 'Fruit Juices', Status: 'Active' },
    { CategoryID: createdCategories[3].CategoryID, CategorySubName: 'Fresh Fruits', Status: 'Active' },
    { CategoryID: createdCategories[3].CategoryID, CategorySubName: 'Fresh Vegetables', Status: 'Active' }
  ];

  const createdSubCategories = [];
  for (const sub of subCategoriesData) {
    const created = await prisma.subCategories.create({ data: sub });
    createdSubCategories.push(created);
  }
  console.log(`✅ ${createdSubCategories.length} SubCategories seeded`);

  // 7. Brands
  const brandsData = [
    { BrandName: 'Amul', Description: 'The Taste of India', Status: 'Active' },
    { BrandName: "Lay's", Description: 'Frito-Lay Potato Chips', Status: 'Active' },
    { BrandName: 'Coca-Cola', Description: 'Refreshing Beverages', Status: 'Active' },
    { BrandName: 'Mother Dairy', Description: 'Happy Food, Happy People', Status: 'Active' },
    { BrandName: 'Fresho', Description: 'Farm fresh fruits and vegetables', Status: 'Active' }
  ];

  const createdBrands = [];
  for (const b of brandsData) {
    const created = await prisma.brands.create({ data: b });
    createdBrands.push(created);
  }
  console.log(`✅ ${createdBrands.length} Brands seeded`);

  // 8. Products & Variants
  const productsData = [
    {
      ProductName: 'Amul Taaza Homogenised Toned Milk',
      ProductDescription: 'Fresh and nutritious toned milk in pouch, 3% fat.',
      SubCategoryID: createdSubCategories[0].SubCategoryID,
      BrandID: createdBrands[0].BrandID,
      ImageURL: 'http://localhost:9000/product-images/amul-taaza.png',
      TaxRate: 0.0,
      IsActive: true,
      variants: [
        { SKU: 'AMUL-TZ-500ML', Weight: 0.5, Size: '500ml', MRP: '28', SalePrice: 27.0, Unit: 'ml', ShelfID: createdShelves[0].ShelfID },
        { SKU: 'AMUL-TZ-1000ML', Weight: 1.0, Size: '1000ml', MRP: '54', SalePrice: 52.0, Unit: 'ml', ShelfID: createdShelves[0].ShelfID }
      ]
    },
    {
      ProductName: "Lay's India's Magic Masala Potato Chips",
      ProductDescription: 'Crispy crunchy potato chips with authentic Indian spices.',
      SubCategoryID: createdSubCategories[2].SubCategoryID,
      BrandID: createdBrands[1].BrandID,
      ImageURL: 'http://localhost:9000/product-images/lays-magic-masala.png',
      TaxRate: 12.0,
      IsActive: true,
      variants: [
        { SKU: 'LAYS-MM-50G', Weight: 0.05, Size: '50g', MRP: '20', SalePrice: 19.0, Unit: 'g', ShelfID: createdShelves[2].ShelfID },
        { SKU: 'LAYS-MM-90G', Weight: 0.09, Size: '90g', MRP: '35', SalePrice: 33.0, Unit: 'g', ShelfID: createdShelves[2].ShelfID }
      ]
    },
    {
      ProductName: 'Coca-Cola Original Taste',
      ProductDescription: 'Carbonated soft drink with original refreshing cola taste.',
      SubCategoryID: createdSubCategories[4].SubCategoryID,
      BrandID: createdBrands[2].BrandID,
      ImageURL: 'http://localhost:9000/product-images/coca-cola.png',
      TaxRate: 28.0,
      IsActive: true,
      variants: [
        { SKU: 'COKE-750ML', Weight: 0.75, Size: '750ml', MRP: '40', SalePrice: 38.0, Unit: 'ml', ShelfID: createdShelves[4].ShelfID },
        { SKU: 'COKE-1250ML', Weight: 1.25, Size: '1.25L', MRP: '65', SalePrice: 60.0, Unit: 'ml', ShelfID: createdShelves[4].ShelfID }
      ]
    },
    {
      ProductName: 'Fresh Robusta Banana',
      ProductDescription: 'Sweet and creamy naturally ripened Robusta bananas.',
      SubCategoryID: createdSubCategories[6].SubCategoryID,
      BrandID: createdBrands[4].BrandID,
      ImageURL: 'http://localhost:9000/product-images/banana-robusta.png',
      TaxRate: 0.0,
      IsActive: true,
      variants: [
        { SKU: 'FRUIT-BAN-1KG', Weight: 1.0, Size: '1kg (approx 4-6 pcs)', MRP: '50', SalePrice: 42.0, Unit: 'kg', ShelfID: createdShelves[5].ShelfID }
      ]
    }
  ];

  let variantCount = 0;
  for (const p of productsData) {
    const { variants, ...prodFields } = p;
    const createdProduct = await prisma.products.create({ data: prodFields });

    for (const v of variants) {
      const createdVariant = await prisma.variants.create({
        data: {
          ...v,
          ProductID: createdProduct.ProductID,
          Status: 'Active'
        }
      });
      variantCount++;

      // Seed Stock for this variant in the dark store
      await prisma.stocks.create({
        data: {
          StoreID: createdStores[0].StoreID,
          VariantID: createdVariant.VariantID,
          ShelfID: v.ShelfID,
          OnHandQty: 100,
          ReservedQty: 5,
          AvailableQty: 95
        }
      });
    }
  }
  console.log(`✅ ${productsData.length} Products, ${variantCount} Variants, and Stocks seeded`);

  // 9. Merchants (Suppliers)
  const merchantsData = [
    {
      Name: 'Heritage Foods & Dairy Suppliers',
      GSTIN: '29ABCDE1234F1Z5',
      Address: 'Plot 18, Whitefield, Bengaluru',
      Contact: '+91 9123456780',
      Category: 'Dairy',
      Status: 'Active'
    },
    {
      Name: 'Frito-Lay India Logistics & Distribution',
      GSTIN: '27AAACP0123M1ZX',
      Address: 'Industrial Zone, Andheri East, Mumbai',
      Contact: '+91 9876543210',
      Category: 'FMCG & Snacks',
      Status: 'Active'
    }
  ];

  for (const m of merchantsData) {
    await prisma.merchants.create({ data: m });
  }
  console.log('✅ Merchants seeded');

  console.log('\n🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
