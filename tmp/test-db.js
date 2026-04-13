const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Check if we can query merchants
    const count = await prisma.merchants.count();
    console.log('📊 Merchants count:', count);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
