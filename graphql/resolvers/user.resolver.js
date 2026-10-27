const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// In-memory OTP store (use Redis in production)
const otpStore = new Map();

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate reset token
function generateResetToken(userId) {
  return jwt.sign({ userId, purpose: 'password_reset' }, JWT_SECRET, { expiresIn: '15m' });
}

const resolvers = {
  Query: {
    me: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const userData = await prisma.users.findUnique({
        where: { UserID: user.UserID }
      });

      if (!userData) return null;

      // Fetch warehouse name
      let warehouseName = "Not Assigned";
      const staff = await prisma.staff.findFirst({ where: { UserID: user.UserID } });
      if (staff) {
        const store = await prisma.stores.findUnique({
          where: { StoreID: staff.StoreID },
          include: { Warehouse: true }
        });
        if (store && store.Warehouse) {
          warehouseName = store.Warehouse.Name;
        }
      } else {
        const rider = await prisma.riders.findFirst({ where: { UserID: user.UserID } });
        if (rider) {
          const store = await prisma.stores.findUnique({
            where: { StoreID: rider.StoreID },
            include: { Warehouse: true }
          });
          if (store && store.Warehouse) {
            warehouseName = store.Warehouse.Name;
          }
        }
      }

      return { ...userData, CurrentWarehouseName: warehouseName };
    },
    allUsers: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      if (user.Role !== 'admin' && user.Role !== 'superadmin') throw new Error('Not authorized');
      return await prisma.users.findMany();
    },
    allAdmins: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      if (user.Role !== 'superadmin') throw new Error('Not authorized - Superadmin only');
      return await prisma.users.findMany({
        where: { Role: { in: ['admin', 'superadmin'] } }
      });
    },
    user: async (_, { UserID }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      if (user.Role !== 'admin') throw new Error('Not authorized');
      return await prisma.users.findUnique({
        where: { UserID }
      });
    },

    pendingUsers: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      let allowedRolesToApprove = [];
      const role = user.Role;

      if (role === 'superadmin') {
        // Superadmin can see all, but specifically manages Level 2 (admin)
        // or bypasses and sees everyone depending on implementation.
        // The user said "2>1", so superadmin approves admin.
        // However, usually superadmins want to see all pending items.
        // I'll keep it as "see all" for superadmin.
        allowedRolesToApprove = undefined;
      } 
      else if (role === 'admin') {
        // Admin (2) approves Level 3
        allowedRolesToApprove = ['manager', 'accountmanager', 'cluster'];
      }
      else if (role === 'manager') {
        // Manager (3) approves Incharge (4)
        allowedRolesToApprove = ['incharge'];
      }
      else if (role === 'accountmanager') {
        // Account Manager (3) approves Accountant (4)
        allowedRolesToApprove = ['accountant'];
      }
      else if (role === 'cluster') {
        // Cluster (3) approves Felt Manager (4)
        allowedRolesToApprove = ['feltmanager'];
      }
      else if (role === 'incharge') {
        // Incharge (4) approves Level 5 (Ops)
        allowedRolesToApprove = ['putter', 'picker'];
      }
      else if (role === 'accountant') {
        // Accountant (4) approves Level 5 (Finance)
        allowedRolesToApprove = ['audit', 'purchase', 'pricecontroller'];
      }
      else if (role === 'feltmanager') {
        // Felt Manager (4) approves Level 5 (Logistics)
        allowedRolesToApprove = ['rider', 'coach'];
      }
      else {
        throw new Error('Not authorized - Need management privilege');
      }

      const whereClause = { IsApproved: false };
      if (allowedRolesToApprove) {
        whereClause.Role = { in: allowedRolesToApprove };
      }

      return await prisma.users.findMany({
        where: whereClause
      });
    },

    myBankAccounts: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await prisma.userBankAccounts.findMany({
        where: { UserID: user.UserID }
      });
    },

    pendingBankAccounts: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      if (user.Role !== 'superadmin' && user.Role !== 'admin' && user.Role !== 'accountmanager' && user.Role !== 'manager' && user.Role !== 'cluster') {
        throw new Error('Not authorized to view pending bank accounts');
      }
      return await prisma.userBankAccounts.findMany({
        where: { IsApproved: false }
      });
    },
    myDocuments: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await prisma.userDocuments.findMany({
        where: { UserID: user.UserID }
      });
    },
    pendingDocuments: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      if (user.Role !== 'superadmin' && user.Role !== 'admin' && user.Role !== 'accountmanager' && user.Role !== 'manager' && user.Role !== 'cluster') {
        throw new Error('Not authorized to view pending documents');
      }
      return await prisma.userDocuments.findMany({
        where: { IsApproved: false }
      });
    },
    myNominees: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await prisma.userNominee.findMany({
        where: { UserID: user.UserID }
      });
    },
    pendingNominees: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      if (user.Role !== 'superadmin' && user.Role !== 'admin' && user.Role !== 'accountmanager' && user.Role !== 'manager' && user.Role !== 'cluster') {
        throw new Error('Not authorized to view pending nominees');
      }
      return await prisma.userNominee.findMany({
        where: { IsApproved: false }
      });
    },

    myLocationChangeRequests: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await prisma.locationChangeRequests.findMany({
        where: { UserID: user.UserID },
        orderBy: { RequestedAt: 'desc' }
      });
    },

    pendingLocationChangeRequests: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      let allowedRolesToApprove = [];
      const role = user.Role;

      if (role === 'superadmin') allowedRolesToApprove = undefined; 
      else if (role === 'admin') allowedRolesToApprove = ['manager', 'accountmanager', 'cluster'];
      else if (role === 'manager') allowedRolesToApprove = ['incharge'];
      else if (role === 'accountmanager') allowedRolesToApprove = ['accountant'];
      else if (role === 'cluster') allowedRolesToApprove = ['feltmanager'];
      else if (role === 'incharge') allowedRolesToApprove = ['putter', 'picker'];
      else if (role === 'accountant') allowedRolesToApprove = ['audit', 'purchase', 'pricecontroller'];
      else if (role === 'feltmanager') allowedRolesToApprove = ['rider', 'coach'];
      else throw new Error('Not authorized to view location change requests');

      const whereClause = { Status: 'pending' };
      if (allowedRolesToApprove) {
        whereClause.User = { Role: { in: allowedRolesToApprove } };
      }

      return await prisma.locationChangeRequests.findMany({
        where: whereClause,
        include: { User: true }
      });
    },
    approvedUsers: async (_, __, { user }) => {
      if (!user || (user.Role !== 'admin' && user.Role !== 'superadmin')) throw new Error('Not authorized');
      return await prisma.users.findMany({ where: { IsApproved: true } });
    },
    approvedBankAccounts: async (_, __, { user }) => {
      if (!user || !['superadmin', 'admin', 'accountmanager'].includes(user.Role)) throw new Error('Not authorized');
      return await prisma.userBankAccounts.findMany({ where: { IsApproved: true } });
    },
    approvedDocuments: async (_, __, { user }) => {
      if (!user || !['superadmin', 'admin', 'accountmanager'].includes(user.Role)) throw new Error('Not authorized');
      return await prisma.userDocuments.findMany({ where: { IsApproved: true } });
    },
    approvedNominees: async (_, __, { user }) => {
      if (!user || !['superadmin', 'admin', 'accountmanager'].includes(user.Role)) throw new Error('Not authorized');
      return await prisma.userNominee.findMany({ where: { IsApproved: true } });
    }
  },

  Mutation: {
    signup: async (_, { UserNameFirst, UserNameLast, DOB, Gender, Email, Mobile, Password, Role }) => {
      const existingUser = await prisma.users.findFirst({
        where: {
          OR: [{ Email }, { Mobile }]
        }
      });

      if (existingUser) {
        throw new Error('User with this email or mobile already exists');
      }

      const hashedPassword = await bcrypt.hash(Password, 10);
      const parsedDOB = new Date(DOB);

      // Check if this is the first user ever
      const totalUsers = await prisma.users.count();
      const isFirstUser = totalUsers === 0;

      let finalRole = Role || 'user';
      let isApproved = false; // requires approval normally

      if (isFirstUser) {
        finalRole = 'superadmin';
        isApproved = true; // First user is automatically approved
      }
      
      const user = await prisma.users.create({
        data: {
          UserNameFirst,
          UserNameLast,
          DOB: parsedDOB,
          Gender,
          Email,
          Mobile,
          Password: hashedPassword,
          Role: finalRole,
          IsApproved: isApproved,
          IsActive: isApproved // Activate if approved (e.g. first user)
        }
      });

      const token = jwt.sign(
        { UserID: user.UserID, Email: user.Email, Role: user.Role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return { token, user };
    },

    login: async (_, { Mobile, Password }) => {
      const user= await prisma.users.findUnique({
        where: { Mobile }
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (!user.IsActive) {
        throw new Error('Account is deactivated. Please contact admin.');
      }

      if (!user.IsApproved) {
        throw new Error('Account is pending approval. Please wait for admin/manager approval.');
      }

      const validPassword = await bcrypt.compare(Password, user.Password);

      if (!validPassword) {
        throw new Error('Invalid password');
      }

      const token = jwt.sign(
        { UserID: user.UserID, Email: user.Email, Role: user.Role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Set user as online
      await prisma.users.update({
        where: { UserID: user.UserID },
        data: { IsOnline: true, LastActiveAt: new Date() }
      });

      return { token, user };
    },

    googleAuth: async (_, { Email, name, GoogleID }) => {
      const nameParts = name.split(' ');
      const UserNameFirst = nameParts[0] || '';
      const UserNameLast = nameParts.slice(1).join(' ') || '';

      let user = await prisma.users.findUnique({
        where: { GoogleID }
      });

      if (!user) {
        user = await prisma.users.findUnique({
          where: { Email }
        });

        if (user) {
          user = await prisma.users.update({
            where: { UserID: user.UserID },
            data: { GoogleID }
          });
        } else {
          user = await prisma.users.create({
            data: {
              UserNameFirst,
              UserNameLast,
              Email,
              GoogleID,
              Role: 'user',
              IsActive: true
            }
          });
        }
      }

      if (!user.IsActive) {
        throw new Error('Account is deactivated. Please contact admin.');
      }

      const token = jwt.sign(
        { UserID: user.UserID, Email: user.Email, Role: user.Role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      await prisma.users.update({
        where: { UserID: user.UserID },
        data: { IsOnline: true, LastActiveAt: new Date() }
      });

      return { token, user };
    },

    updateMyProfile: async (_, args, { user }) => {
      if (!user) throw new Error('Not authenticated');

      const updateData = { ...args };
      
      // Handle DOB - convert empty string to null or parse valid date
      if (updateData.DOB === '' || updateData.DOB === null || updateData.DOB === undefined) {
        updateData.DOB = null;
      } else if (updateData.DOB) {
        updateData.DOB = new Date(updateData.DOB);
      }

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) delete updateData[key];
      });

      const updatedUser = await prisma.users.update({
        where: { UserID: user.UserID },
        data: updateData
      });

      return updatedUser;
    },

    updateOnlineStatus: async (_, { IsOnline }, { user }) => {
      if (!user) throw new Error('Not authenticated');

      const updatedUser = await prisma.users.update({
        where: { UserID: user.UserID },
        data: { IsOnline, LastActiveAt: new Date() }
      });

      return updatedUser;
    },

    updateMobile: async (_, { Mobile }, { user }) => {
      if (!user) throw new Error('Not authenticated');

      const existingUser = await prisma.users.findUnique({
        where: { Mobile }
      });

      if (existingUser && existingUser.UserID !== user.UserID) {
        throw new Error('Mobile number already in use');
      }

      const updatedUser = await prisma.users.update({
        where: { UserID: user.UserID },
        data: { Mobile }
      });

      return updatedUser;
    },

    updateUser: async (_, args, { user }) => {
      if (!user) throw new Error('Not authenticated');
      if (user.Role !== 'admin' && user.Role !== 'superadmin') throw new Error('Not authorized');

      const targetUser = await prisma.users.findUnique({ where: { UserID: args.UserID } });
      if (!targetUser) throw new Error('User not found');
      
      // Admin cannot modify superadmin
      if (user.Role === 'admin' && targetUser.Role === 'superadmin') {
        throw new Error('Not authorized - Cannot modify superadmin');
      }
      
      // Admin cannot promote to superadmin
      if (user.Role === 'admin' && args.Role === 'superadmin') {
        throw new Error('Not authorized - Cannot promote to superadmin');
      }

      const { UserID, WarehouseID, ...updateData } = args;

      // Handle DOB - convert empty string to null or parse valid date
      if (updateData.DOB === '' || updateData.DOB === null || updateData.DOB === undefined) {
        updateData.DOB = null;
      } else if (updateData.DOB) {
        updateData.DOB = new Date(updateData.DOB);
      }

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) delete updateData[key];
      });

      const updatedUser = await prisma.users.update({
        where: { UserID },
        data: updateData
      });

      // Handle Warehouse assignment
      if (WarehouseID) {
        const store = await prisma.stores.findFirst({
          where: { WarehouseID }
        });
        
        if (store) {
          const role = updateData.Role || targetUser.Role;
          const isRiderRole = ['rider', 'coach'].includes(role);
          
          if (isRiderRole) {
            await prisma.riders.upsert({
              where: { UserID_StoreID: { UserID, StoreID: store.StoreID } }, // Check if composite unique exists
              update: { StoreID: store.StoreID },
              create: { UserID, StoreID: store.StoreID, Status: 'active' }
            }).catch(async () => {
              // Fallback if no composite unique
               await prisma.riders.updateMany({
                where: { UserID },
                data: { StoreID: store.StoreID }
              });
              const existing = await prisma.riders.findFirst({ where: { UserID } });
              if (!existing) {
                await prisma.riders.create({
                  data: { UserID, StoreID: store.StoreID, Status: 'active' }
                });
              }
            });
          } else {
            // Staff
            await prisma.staff.upsert({
              where: { UserID_StoreID: { UserID, StoreID: store.StoreID } },
              update: { StoreID: store.StoreID },
              create: { UserID, StoreID: store.StoreID, RoleID: 1, Status: 'active' } // Default RoleID 1
            }).catch(async () => {
              await prisma.staff.updateMany({
                where: { UserID },
                data: { StoreID: store.StoreID }
              });
              const existing = await prisma.staff.findFirst({ where: { UserID } });
              if (!existing) {
                await prisma.staff.create({
                  data: { UserID, StoreID: store.StoreID, RoleID: 1, Status: 'active' }
                });
              }
            });
          }
        }
      }

      return updatedUser;
    },

    deleteUser: async (_, { UserID }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      if (user.Role !== 'admin' && user.Role !== 'superadmin') throw new Error('Not authorized');

      const targetUser = await prisma.users.findUnique({ where: { UserID } });
      if (!targetUser) throw new Error('User not found');
      
      // Admin cannot delete superadmin
      if (user.Role === 'admin' && targetUser.Role === 'superadmin') {
        throw new Error('Not authorized - Cannot delete superadmin');
      }

      await prisma.users.delete({
        where: { UserID }
      });

      return true;
    },

    deactivateUser: async (_, { UserID }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      if (user.Role !== 'admin' && user.Role !== 'superadmin') throw new Error('Not authorized');

      const targetUser = await prisma.users.findUnique({ where: { UserID } });
      if (!targetUser) throw new Error('User not found');
      
      // Admin cannot deactivate superadmin
      if (user.Role === 'admin' && targetUser.Role === 'superadmin') {
        throw new Error('Not authorized - Cannot deactivate superadmin');
      }

      const updatedUser = await prisma.users.update({
        where: { UserID },
        data: { IsActive: false }
      });

      return updatedUser;
    },

    reactivateUser: async (_, { UserID }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      if (user.Role !== 'admin' && user.Role !== 'superadmin') throw new Error('Not authorized');

      const targetUser = await prisma.users.findUnique({ where: { UserID } });
      if (!targetUser) throw new Error('User not found');
      
      // Admin cannot reactivate superadmin
      if (user.Role === 'admin' && targetUser.Role === 'superadmin') {
        throw new Error('Not authorized - Cannot reactivate superadmin');
      }

      const updatedUser = await prisma.users.update({
        where: { UserID },
        data: { IsActive: true }
      });

      return updatedUser;
    },

    logout: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');

      await prisma.users.update({
        where: { UserID: user.UserID },
        data: { IsOnline: false, LastActiveAt: new Date() }
      });

      return true;
    },

    promoteToAdmin: async (_, { UserID }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      if (user.Role !== 'superadmin') throw new Error('Not authorized - Superadmin only');

      const updatedUser = await prisma.users.update({
        where: { UserID },
        data: { Role: 'admin' }
      });

      return updatedUser;
    },

    demoteToUser: async (_, { UserID }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      if (user.Role !== 'superadmin') throw new Error('Not authorized - Superadmin only');

      const targetUser = await prisma.users.findUnique({ where: { UserID } });
      if (targetUser.Role === 'superadmin') {
        throw new Error('Cannot demote superadmin');
      }

      const updatedUser = await prisma.users.update({
        where: { UserID },
        data: { Role: 'user' }
      });

      return updatedUser;
    },

    createSuperAdmin: async (_, { Email, Password, Mobile, UserNameFirst, UserNameLast }) => {
      const existingUser = await prisma.users.findUnique({ where: { Email } });
      if (existingUser) throw new Error('User with this email already exists');

      const existingMobile = await prisma.users.findUnique({ where: { Mobile } });
      if (existingMobile) throw new Error('User with this mobile already exists');

      const hashedPassword = await bcrypt.hash(Password, 10);

      const user = await prisma.users.create({
        data: {
          UserNameFirst,
          UserNameLast,
          Email,
          Mobile,
          Password: hashedPassword,
          Role: 'superadmin',
          IsActive: true
        }
      });

      const token = jwt.sign(
        { UserID: user.UserID, Email: user.Email, Role: user.Role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return { token, user };
    },

    forgotPassword: async (_, { Email, Mobile }) => {
      if (!Email && !Mobile) {
        throw new Error('Please provide email or mobile');
      }

      const whereClause = Email ? { Email } : { Mobile };
      const user = await prisma.users.findFirst({ where: whereClause });

      if (!user) {
        throw new Error('User not found');
      }

      // Generate OTP
      const otp = generateOTP();
      const key = Email || Mobile;
      
      // Store OTP with expiry (10 minutes)
      otpStore.set(key, {
        otp,
        userId: user.UserID,
        expiresAt: Date.now() + 10 * 60 * 1000
      });

      // Log OTP to console (in production, send via email/SMS)
      console.log('========================================');
      console.log('🔐 PASSWORD RESET OTP');
      console.log('========================================');
      console.log(`To: ${Email || Mobile}`);
      console.log(`OTP: ${otp}`);
      console.log(`Expires: 10 minutes`);
      console.log('========================================');

      return {
        success: true,
        message: 'OTP sent successfully. Please check your email/mobile.'
      };
    },

    verifyOTP: async (_, { Email, Mobile, otp }) => {
      if (!otp) {
        throw new Error('Please provide OTP');
      }

      const key = Email || Mobile;
      const storedData = otpStore.get(key);

      if (!storedData) {
        throw new Error('OTP not found or expired. Please request a new one.');
      }

      if (Date.now() > storedData.expiresAt) {
        otpStore.delete(key);
        throw new Error('OTP expired. Please request a new one.');
      }

      if (storedData.otp !== otp) {
        throw new Error('Invalid OTP');
      }

      // OTP verified - generate reset token
      const resetToken = generateResetToken(storedData.userId);
      
      // Clear OTP from store
      otpStore.delete(key);

      return {
        success: true,
        message: 'OTP verified successfully',
        token: resetToken
      };
    },

    resetPassword: async (_, { token, newPassword }) => {
      if (!token || !newPassword) {
        throw new Error('Token and new password are required');
      }

      if (newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (err) {
        throw new Error('Invalid or expired token');
      }

      if (decoded.purpose !== 'password_reset') {
        throw new Error('Invalid token');
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await prisma.users.update({
        where: { UserID: decoded.userId },
        data: { Password: hashedPassword }
      });

      return {
        success: true,
        message: 'Password reset successfully'
      };
    },

    changePassword: async (_, { currentPassword, newPassword }, { user }) => {
      if (!user) throw new Error('Not authenticated');

      if (!currentPassword || !newPassword) {
        throw new Error('Current password and new password are required');
      }

      if (newPassword.length < 6) {
        throw new Error('New password must be at least 6 characters');
      }

      // Get user with password
      const userWithPassword = await prisma.users.findUnique({
        where: { UserID: user.UserID }
      });

      if (!userWithPassword.Password) {
        throw new Error('Cannot change password for Google-authenticated accounts');
      }

      // Verify current password
      const validPassword = await bcrypt.compare(currentPassword, userWithPassword.Password);
      if (!validPassword) {
        throw new Error('Current password is incorrect');
      }

      // Hash and update new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await prisma.users.update({
        where: { UserID: user.UserID },
        data: { Password: hashedPassword }
      });

      return {
        success: true,
        message: 'Password changed successfully'
      };
    },

    approveUser: async (_, { UserID }, { user }) => {
      if (!user) throw new Error('Not authenticated');

      const targetUser = await prisma.users.findUnique({ where: { UserID } });
      if (!targetUser) throw new Error('User not found');

      // Define capability map (who can approve whom)
      const canApprove = (approverRole, targetRole) => {
        if (approverRole === 'superadmin') return true;
        
        // Level 2 approves Level 3
        if (approverRole === 'admin') {
           return ['manager', 'accountmanager', 'cluster'].includes(targetRole);
        }
        
        // Level 3 approves Level 4 (Specific verticals)
        if (approverRole === 'manager') return ['incharge'].includes(targetRole);
        if (approverRole === 'accountmanager') return ['accountant'].includes(targetRole);
        if (approverRole === 'cluster') return ['feltmanager'].includes(targetRole);

        // Level 4 approves Level 5 (Specific verticals)
        if (approverRole === 'incharge') return ['putter', 'picker'].includes(targetRole);
        if (approverRole === 'accountant') return ['audit', 'purchase', 'pricecontroller'].includes(targetRole);
        if (approverRole === 'feltmanager') return ['rider', 'coach'].includes(targetRole);
        
        return false;
      };

      if (!canApprove(user.Role, targetUser.Role)) {
        throw new Error(`Not authorized - ${user.Role} cannot approve a ${targetUser.Role}`);
      }

      const updatedUser = await prisma.users.update({
        where: { UserID },
        data: { 
          IsApproved: true,
          IsActive: true,
          ApprovedAt: new Date(),
          ApprovedByID: user.UserID
        }
      });

      return updatedUser;
    },

    rejectUser: async (_, { UserID }, { user }) => {
      if (!user) throw new Error('Not authenticated');

      const targetUser = await prisma.users.findUnique({ where: { UserID } });
      if (!targetUser) throw new Error('User not found');

      // Re-use same capability mapping as approve
      const canReject = (approverRole, targetRole) => {
        if (approverRole === 'superadmin') return true;
        
        // Match the approve hierarchy
        if (approverRole === 'admin') return ['manager', 'accountmanager', 'cluster'].includes(targetRole);
        if (approverRole === 'manager') return ['incharge'].includes(targetRole);
        if (approverRole === 'accountmanager') return ['accountant'].includes(targetRole);
        if (approverRole === 'cluster') return ['feltmanager'].includes(targetRole);
        if (approverRole === 'incharge') return ['putter', 'picker'].includes(targetRole);
        if (approverRole === 'accountant') return ['audit', 'purchase', 'pricecontroller'].includes(targetRole);
        if (approverRole === 'feltmanager') return ['rider', 'coach'].includes(targetRole);
        
        return false;
      };

      if (!canReject(user.Role, targetUser.Role)) {
        throw new Error(`Not authorized - ${user.Role} cannot reject a ${targetUser.Role}`);
      }

      // Delete the rejected user
      await prisma.users.delete({
        where: { UserID }
      });

      return true;
    },

    addBankAccount: async (_, args, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      if (args.IsPrimary) {
        await prisma.userBankAccounts.updateMany({
          where: { UserID: user.UserID },
          data: { IsPrimary: false }
        });
      }

      return await prisma.userBankAccounts.create({
        data: {
          ...args,
          UserID: user.UserID,
          IsApproved: false // Always needs approval
        }
      });
    },

    updateBankAccount: async (_, args, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const { BankID, ...updateData } = args;

      const account = await prisma.userBankAccounts.findUnique({ where: { BankID } });
      if (!account || account.UserID !== user.UserID) throw new Error('Account not found');

      if (updateData.IsPrimary) {
        await prisma.userBankAccounts.updateMany({
          where: { UserID: user.UserID },
          data: { IsPrimary: false }
        });
      }

      return await prisma.userBankAccounts.update({
        where: { BankID },
        data: { ...updateData, IsApproved: false } // Re-trigger approval on update
      });
    },

    deleteBankAccount: async (_, { BankID }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const account = await prisma.userBankAccounts.findUnique({ where: { BankID } });
      if (!account) throw new Error('Account not found');

      const isAdmin = ['superadmin', 'admin', 'accountmanager'].includes(user.Role);
      const isOwner = account.UserID === user.UserID;

      if (!isAdmin && !isOwner) throw new Error('Not authorized');
      
      // Owners can only delete if NOT approved
      if (isOwner && !isAdmin && account.IsApproved) {
        throw new Error('Approved bank accounts cannot be deleted by users. Please contact admin.');
      }

      await prisma.userBankAccounts.delete({ where: { BankID } });
      return true;
    },

    approveBankAccount: async (_, { BankID }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      if (user.Role !== 'superadmin' && user.Role !== 'admin' && user.Role !== 'accountmanager' && user.Role !== 'manager' && user.Role !== 'cluster') {
        throw new Error('Not authorized to approve bank accounts');
      }

      return await prisma.userBankAccounts.update({
        where: { BankID },
        data: { 
          IsApproved: true,
          ApprovedAt: new Date(),
          ApprovedByID: user.UserID
        }
      });
    },

    addDocument: async (_, args, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await prisma.userDocuments.create({
        data: {
          ...args,
          UserID: user.UserID,
          IsApproved: false
        }
      });
    },

    updateDocument: async (_, args, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const { DocID, ...updateData } = args;

      const doc = await prisma.userDocuments.findUnique({ where: { DocID } });
      if (!doc || doc.UserID !== user.UserID) throw new Error('Document not found');

      return await prisma.userDocuments.update({
        where: { DocID },
        data: { ...updateData, IsApproved: false }
      });
    },

    deleteDocument: async (_, { DocID }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const doc = await prisma.userDocuments.findUnique({ where: { DocID } });
      if (!doc) throw new Error('Document not found');

      const isAdmin = ['superadmin', 'admin', 'accountmanager'].includes(user.Role);
      const isOwner = doc.UserID === user.UserID;

      if (!isAdmin && !isOwner) throw new Error('Not authorized');

      // Owners can only delete if NOT approved
      if (isOwner && !isAdmin && doc.IsApproved) {
        throw new Error('Approved documents cannot be deleted by users. Please contact admin.');
      }

      await prisma.userDocuments.delete({ where: { DocID } });
      return true;
    },
    approveDocument: async (_, { DocID }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      if (user.Role !== 'superadmin' && user.Role !== 'admin' && user.Role !== 'accountmanager' && user.Role !== 'manager' && user.Role !== 'cluster') {
        throw new Error('Not authorized to approve documents');
      }

      return await prisma.userDocuments.update({
        where: { DocID },
        data: { 
          IsApproved: true,
          ApprovedAt: new Date(),
          ApprovedByID: user.UserID
        }
      });
    },

    addNominee: async (_, args, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await prisma.userNominee.create({
        data: {
          ...args,
          UserID: user.UserID,
          IsApproved: false
        }
      });
    },

    updateNominee: async (_, args, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const { NomineeID, ...updateData } = args;

      const nominee = await prisma.userNominee.findUnique({ where: { NomineeID } });
      if (!nominee || nominee.UserID !== user.UserID) throw new Error('Nominee not found');

      return await prisma.userNominee.update({
        where: { NomineeID },
        data: { ...updateData, IsApproved: false }
      });
    },

    deleteNominee: async (_, { NomineeID }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const nominee = await prisma.userNominee.findUnique({ where: { NomineeID } });
      if (!nominee) throw new Error('Nominee not found');

      const isAdmin = ['superadmin', 'admin', 'accountmanager'].includes(user.Role);
      const isOwner = nominee.UserID === user.UserID;

      if (!isAdmin && !isOwner) throw new Error('Not authorized');

      if (isOwner && !isAdmin && nominee.IsApproved) {
        throw new Error('Approved nominees cannot be deleted by users. Please contact admin.');
      }

      await prisma.userNominee.delete({ where: { NomineeID } });
      return true;
    },

    approveNominee: async (_, { NomineeID }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      if (user.Role !== 'superadmin' && user.Role !== 'admin' && user.Role !== 'accountmanager' && user.Role !== 'manager' && user.Role !== 'cluster') {
        throw new Error('Not authorized to approve nominees');
      }

      return await prisma.userNominee.update({
        where: { NomineeID },
        data: { 
          IsApproved: true,
          ApprovedAt: new Date(),
          ApprovedByID: user.UserID
        }
      });
    },

    rejectNominee: async (_, { NomineeID }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      if (user.Role !== 'superadmin' && user.Role !== 'admin' && user.Role !== 'accountmanager' && user.Role !== 'manager' && user.Role !== 'cluster') {
        throw new Error('Not authorized to reject nominees');
      }

      await prisma.userNominee.delete({
        where: { NomineeID }
      });
      return true;
    },

    requestLocationChange: async (_, { NewLocationID, Type, Reason }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Get old location
      let oldLocationID = null;
      const staff = await prisma.staff.findFirst({ where: { UserID: user.UserID } });
      if (staff) oldLocationID = staff.StoreID;
      else {
        const rider = await prisma.riders.findFirst({ where: { UserID: user.UserID } });
        if (rider) oldLocationID = rider.StoreID;
      }

      return await prisma.locationChangeRequests.create({
        data: {
          UserID: user.UserID,
          OldLocationID: oldLocationID,
          NewLocationID,
          Type,
          Reason,
          Status: 'pending'
        }
      });
    },

    approveLocationChange: async (_, { RequestID }, { user: approver }) => {
      if (!approver) throw new Error('Not authenticated');
      
      const request = await prisma.locationChangeRequests.findUnique({
        where: { RequestID },
        include: { User: true }
      });
      if (!request) throw new Error('Request not found');
      if (request.Status !== 'pending') throw new Error('Request already processed');

      // Hierarchy check (reuse same logic as approveUser)
      const canApprove = (approverRole, targetRole) => {
        if (approverRole === 'superadmin') return true;
        if (approverRole === 'admin') return ['manager', 'accountmanager', 'cluster'].includes(targetRole);
        if (approverRole === 'manager') return ['incharge'].includes(targetRole);
        if (approverRole === 'accountmanager') return ['accountant'].includes(targetRole);
        if (approverRole === 'cluster') return ['feltmanager'].includes(targetRole);
        if (approverRole === 'incharge') return ['putter', 'picker'].includes(targetRole);
        if (approverRole === 'accountant') return ['audit', 'purchase', 'pricecontroller'].includes(targetRole);
        if (approverRole === 'feltmanager') return ['rider', 'coach'].includes(targetRole);
        return false;
      };

      if (!canApprove(approver.Role, request.User.Role)) {
        throw new Error('Not authorized to approve this request');
      }

      // Perform the update
      const targetUserID = request.UserID;
      const newStoreID = request.NewLocationID;

      // Update Staff table
      await prisma.staff.updateMany({
        where: { UserID: targetUserID },
        data: { StoreID: newStoreID }
      });

      // Update Riders table
      await prisma.riders.updateMany({
        where: { UserID: targetUserID },
        data: { StoreID: newStoreID }
      });

      return await prisma.locationChangeRequests.update({
        where: { RequestID },
        data: {
          Status: 'approved',
          ApprovedAt: new Date(),
          ApprovedByID: approver.UserID
        }
      });
    },

    rejectLocationChange: async (_, { RequestID }, { user: approver }) => {
      if (!approver) throw new Error('Not authenticated');
      
      const request = await prisma.locationChangeRequests.findUnique({
        where: { RequestID },
        include: { User: true }
      });
      if (!request) throw new Error('Request not found');

      // Re-use canApprove logic for rejection authority
      const canApprove = (approverRole, targetRole) => {
        if (approverRole === 'superadmin') return true;
        if (approverRole === 'admin') return ['manager', 'accountmanager', 'cluster'].includes(targetRole);
        if (approverRole === 'manager') return ['incharge'].includes(targetRole);
        if (approverRole === 'accountmanager') return ['accountant'].includes(targetRole);
        if (approverRole === 'cluster') return ['feltmanager'].includes(targetRole);
        if (approverRole === 'incharge') return ['putter', 'picker'].includes(targetRole);
        if (approverRole === 'accountant') return ['audit', 'purchase', 'pricecontroller'].includes(targetRole);
        if (approverRole === 'feltmanager') return ['rider', 'coach'].includes(targetRole);
        return false;
      };

      if (!canApprove(approver.Role, request.User.Role)) {
        throw new Error('Not authorized to reject this request');
      }

      await prisma.locationChangeRequests.update({
        where: { RequestID },
        data: { Status: 'rejected' }
      });

      return true;
    }
  },

  Users: {
    CreatedAt: (parent) => parent.CreatedAt instanceof Date ? parent.CreatedAt.toISOString() : (parent.CreatedAt || null),
    LastActiveAt: (parent) => parent.LastActiveAt instanceof Date ? parent.LastActiveAt.toISOString() : (parent.LastActiveAt || null),
    DOB: (parent) => parent.DOB instanceof Date ? parent.DOB.toISOString().split('T')[0] : (parent.DOB || null),
    ApprovedAt: (parent) => parent.ApprovedAt instanceof Date ? parent.ApprovedAt.toISOString() : (parent.ApprovedAt || null),
    WarehouseID: async (parent) => {
      const staff = await prisma.staff.findFirst({ where: { UserID: parent.UserID } });
      if (staff) {
        const store = await prisma.stores.findUnique({ where: { StoreID: staff.StoreID } });
        return store ? store.WarehouseID : null;
      }
      const rider = await prisma.riders.findFirst({ where: { UserID: parent.UserID } });
      if (rider) {
        const store = await prisma.stores.findUnique({ where: { StoreID: rider.StoreID } });
        return store ? store.WarehouseID : null;
      }
      return null;
    },
    WarehouseName: async (parent) => {
      let warehouseID = null;
      const staff = await prisma.staff.findFirst({ where: { UserID: parent.UserID } });
      if (staff) {
        const store = await prisma.stores.findUnique({ where: { StoreID: staff.StoreID } });
        if (store) warehouseID = store.WarehouseID;
      } else {
        const rider = await prisma.riders.findFirst({ where: { UserID: parent.UserID } });
        if (rider) {
          const store = await prisma.stores.findUnique({ where: { StoreID: rider.StoreID } });
          if (store) warehouseID = store.WarehouseID;
        }
      }

      if (warehouseID) {
        const warehouse = await prisma.warehouses.findUnique({ where: { WarehouseID: warehouseID } });
        return warehouse ? warehouse.Name : null;
      }
      return null;
    }
  }
};

module.exports = resolvers;
