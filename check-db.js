const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'UserNominee'
    `;
    console.log('Columns in UserNominee:', columns);
  } catch (err) {
    console.error('Error checking columns:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
