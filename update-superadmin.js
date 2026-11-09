const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function makeSuperAdmin(mobile = '9985699757', shouldUpsert = false) {
  try {
    const user = await prisma.users.findUnique({
      where: { Mobile: mobile },
    });

    if (!user) {
      if (shouldUpsert) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        const created = await prisma.users.create({
          data: {
            UserNameFirst: 'Super',
            UserNameLast: 'Admin',
            Email: `admin_${mobile}@zepto.local`,
            Mobile: mobile,
            Password: hashedPassword,
            Role: 'superadmin',
            IsActive: true,
            IsApproved: true,
            ApprovedAt: new Date(),
          },
        });
        console.log(`✅ User (${created.Mobile}) naya create karke superadmin set kar diya gaya (Default Password: admin123):`, created);
        return;
      }
      console.log(`⚠️ User with mobile '${mobile}' database me nahi mila.`);
      console.log(`👉 Agar naya user create karna hai to: node update-superadmin.js ${mobile} --upsert`);
      return;
    }

    const updated = await prisma.users.update({
      where: { Mobile: mobile },
      data: {
        Role: 'superadmin',
        IsActive: true,
        IsApproved: true,
        ApprovedAt: new Date(),
      },
    });

    console.log(`✅ User (${updated.Mobile}) successfully updated to superadmin via Prisma:`, {
      UserID: updated.UserID,
      Name: `${updated.UserNameFirst} ${updated.UserNameLast}`,
      Email: updated.Email,
      Mobile: updated.Mobile,
      Role: updated.Role,
      IsActive: updated.IsActive,
      IsApproved: updated.IsApproved,
      ApprovedAt: updated.ApprovedAt,
    });
  } catch (error) {
    console.error('❌ Error updating user via Prisma:', error);
  } finally {
    await prisma.$disconnect();
  }
}

const args = process.argv.slice(2);
const mobile = args.find((a) => !a.startsWith('--')) || '9985699757';
const shouldUpsert = args.includes('--upsert');

makeSuperAdmin(mobile, shouldUpsert);
