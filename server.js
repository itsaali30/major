require('dotenv').config();
const express = require('express');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');

const typeDefs = require('./graphql/schemas');
const resolvers = require('./graphql/resolvers');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

const multer = require('multer');
const { minioClient, bucketName, bankBucketName, docBucketName, productBucketName } = require('./minio-config');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const upload = multer({ storage: multer.memoryStorage() });

// Stream files from MinIO via Express so they work across ngrok, localhost, and docker
const streamMinioFile = async (bucket, fileName, res) => {
  try {
    const stat = await minioClient.statObject(bucket, fileName);
    if (stat.metaData && stat.metaData['content-type']) {
      res.setHeader('Content-Type', stat.metaData['content-type']);
    }
    const stream = await minioClient.getObject(bucket, fileName);
    stream.on('error', () => res.status(404).json({ error: 'File not found' }));
    stream.pipe(res);
  } catch (err) {
    res.status(404).json({ error: 'File not found' });
  }
};

app.get('/storage/:bucket/:fileName', (req, res) => {
  streamMinioFile(req.params.bucket, req.params.fileName, res);
});

app.get('/:bucket(user-image|bank-images|user-documents|product-images)/:fileName', (req, res) => {
  streamMinioFile(req.params.bucket, req.params.fileName, res);
});

app.post('/upload-profile-image', upload.single('image'), async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Not authenticated' });

    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || !decoded.UserID) return res.status(401).json({ error: 'Invalid token' });

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const fileName = `user-${decoded.UserID}-${Date.now()}${path.extname(req.file.originalname)}`;
    
    await minioClient.putObject(bucketName, fileName, req.file.buffer, req.file.size, {
      'Content-Type': req.file.mimetype
    });

    const protocol = req.protocol;
    const host = req.get('host');
    const minioUrl = `/storage/${bucketName}/${fileName}`;
    console.log(`📸 Image uploaded and accessible at: ${minioUrl}`);

    await prisma.users.update({
      where: { UserID: decoded.UserID },
      data: { ProfileImageUrl: minioUrl }
    });

    res.json({ success: true, imageUrl: minioUrl });
  } catch (err) {
    console.error('Upload error details:', err);
    res.status(500).json({ 
      error: 'Upload failed', 
      details: err.message,
      code: err.code 
    });
  }
});

app.post('/upload-bank-image', upload.single('image'), async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Not authenticated' });

    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || !decoded.UserID) return res.status(401).json({ error: 'Invalid token' });

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const fileName = `bank-proof-${decoded.UserID}-${Date.now()}${path.extname(req.file.originalname)}`;
    
    await minioClient.putObject(bankBucketName, fileName, req.file.buffer, req.file.size, {
      'Content-Type': req.file.mimetype
    });

    const minioUrl = `/storage/${bankBucketName}/${fileName}`;
    console.log(`📸 Bank proof uploaded: ${minioUrl}`);

    res.json({ success: true, imageUrl: minioUrl });
  } catch (err) {
    console.error('Bank upload error:', err);
    res.status(500).json({ error: 'Upload failed', details: err.message });
  }
});

app.post('/upload-doc-image', upload.single('image'), async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Not authenticated' });

    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || !decoded.UserID) return res.status(401).json({ error: 'Invalid token' });

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const fileName = `doc-${decoded.UserID}-${Date.now()}${path.extname(req.file.originalname)}`;
    
    await minioClient.putObject(docBucketName, fileName, req.file.buffer, req.file.size, {
      'Content-Type': req.file.mimetype
    });

    const minioUrl = `/storage/${docBucketName}/${fileName}`;
    console.log(`📸 Document uploaded: ${minioUrl}`);

    res.json({ success: true, imageUrl: minioUrl });
  } catch (err) {
    console.error('Document upload error:', err);
    res.status(500).json({ error: 'Upload failed', details: err.message });
  }
});

app.post('/upload-catalog-image', upload.single('image'), async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Not authenticated' });

    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || !decoded.UserID) return res.status(401).json({ error: 'Invalid token' });

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const fileName = `catalog-${Date.now()}${path.extname(req.file.originalname)}`;
    
    await minioClient.putObject(productBucketName, fileName, req.file.buffer, req.file.size, {
      'Content-Type': req.file.mimetype
    });

    const minioUrl = `/storage/${productBucketName}/${fileName}`;
    console.log(`📸 Catalog image uploaded: ${minioUrl}`);

    res.json({ success: true, imageUrl: minioUrl });
  } catch (err) {
    console.error('Catalog upload error:', err);
    res.status(500).json({ error: 'Upload failed', details: err.message });
  }
});

// ==========================================
// WMS DUTY RECORDS & PUNCH-IN APPROVAL APIS
// ==========================================

// Helper auth check for Admin API
function getAuthUser(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

// 1. Get All Duty Records (with filters)
app.get('/api/admin/duty-records', async (req, res) => {
  try {
    const { status, role } = req.query;
    const where = {};
    if (status && status !== 'all') {
      where.ApprovalStatus = status;
    }

    const records = await prisma.dutyRecords.findMany({
      where,
      orderBy: { DutyID: 'desc' },
      take: 100
    });

    const enriched = await Promise.all(
      records.map(async (rec) => {
        const user = await prisma.users.findUnique({
          where: { UserID: rec.UserID },
          select: { UserID: true, UserNameFirst: true, UserNameLast: true, Mobile: true, Email: true, Role: true, ProfileImageUrl: true }
        });

        let approver = null;
        if (rec.ApprovedByID) {
          approver = await prisma.users.findUnique({
            where: { UserID: rec.ApprovedByID },
            select: { UserNameFirst: true, UserNameLast: true, Role: true }
          });
        }

        return {
          dutyId: rec.DutyID,
          userId: rec.UserID,
          staffId: rec.StaffID,
          employeeName: user ? `${user.UserNameFirst} ${user.UserNameLast || ''}`.trim() : `Staff #${rec.StaffID}`,
          employeeMobile: user?.Mobile || 'N/A',
          employeeRole: user?.Role || 'staff',
          profileImage: user?.ProfileImageUrl || null,
          shiftSlot: rec.ShiftSlot || 'General',
          date: rec.Date,
          punchInTime: rec.PunchInTime,
          punchOutTime: rec.PunchOutTime,
          selfieUrl: rec.SelfieUrl,
          approvalStatus: rec.ApprovalStatus,
          approvalCode: rec.ApprovalCode,
          approvedByName: approver ? `${approver.UserNameFirst} ${approver.UserNameLast || ''}`.trim() : null,
          approvedAt: rec.ApprovedAt,
          totalHours: rec.TotalHours || 0,
          notes: rec.Notes
        };
      })
    );

    // Apply role filter if passed
    const filtered = (role && role !== 'all')
      ? enriched.filter(r => r.employeeRole.toLowerCase() === role.toLowerCase())
      : enriched;

    // Deduplicate / Group by Employee (userId) to avoid duplicate rows
    const employeeMap = new Map();
    const statusPriority = { 'ACTIVE': 4, 'PENDING_APPROVAL': 3, 'APPROVED': 2, 'COMPLETED': 1, 'REJECTED': 0 };

    for (const rec of filtered) {
      if (!employeeMap.has(rec.userId)) {
        employeeMap.set(rec.userId, {
          ...rec,
          totalShifts: 1,
          history: [{ ...rec }]
        });
      } else {
        const emp = employeeMap.get(rec.userId);
        emp.totalShifts += 1;
        emp.history.push({ ...rec });

        // If the newer/alternative record has a higher priority status, promote it as current duty summary
        const currentPrio = statusPriority[emp.approvalStatus] ?? -1;
        const newPrio = statusPriority[rec.approvalStatus] ?? -1;
        if (newPrio > currentPrio) {
          emp.dutyId = rec.dutyId;
          emp.shiftSlot = rec.shiftSlot;
          emp.punchInTime = rec.punchInTime;
          emp.punchOutTime = rec.punchOutTime;
          emp.approvalStatus = rec.approvalStatus;
          emp.approvalCode = rec.approvalCode;
          emp.approvedByName = rec.approvedByName;
          emp.approvedAt = rec.approvedAt;
          emp.totalHours = rec.totalHours;
          emp.date = rec.date;
          emp.notes = rec.notes;
          if (rec.selfieUrl) emp.selfieUrl = rec.selfieUrl;
        }
      }
    }

    const uniqueEmployees = Array.from(employeeMap.values());

    res.json({
      success: true,
      records: uniqueEmployees,
      rawRecords: filtered,
      counts: {
        pending: enriched.filter(r => r.approvalStatus === 'PENDING_APPROVAL').length,
        approved: enriched.filter(r => r.approvalStatus === 'APPROVED').length,
        active: enriched.filter(r => r.approvalStatus === 'ACTIVE').length,
        completed: enriched.filter(r => r.approvalStatus === 'COMPLETED').length
      }
    });
  } catch (err) {
    console.error('Duty records fetch error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Manager Approves Employee Punch-In & Generates/Assigns 4-Digit Code
app.post('/api/admin/duty-approve', async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const { dutyId, customCode } = req.body;

    if (!dutyId) {
      return res.status(400).json({ success: false, error: 'Duty ID is required' });
    }

    const duty = await prisma.dutyRecords.findUnique({
      where: { DutyID: Number(dutyId) }
    });

    if (!duty) {
      return res.status(404).json({ success: false, error: 'Duty record not found' });
    }

    // 4-digit code provided or auto-generated
    const code = customCode && String(customCode).trim().length === 4
      ? String(customCode).trim()
      : String(Math.floor(1000 + Math.random() * 9000));

    const updated = await prisma.dutyRecords.update({
      where: { DutyID: duty.DutyID },
      data: {
        ApprovalStatus: 'APPROVED',
        ApprovalCode: code,
        ApprovedByID: authUser?.UserID || 1,
        ApprovedAt: new Date(),
        Notes: `Approved by manager with 4-digit code: ${code}`
      }
    });

    // Also update AttendanceLogs status
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const attLog = await prisma.attendanceLogs.findFirst({
      where: { StaffID: duty.StaffID, Date: { gte: today } },
      orderBy: { LogID: 'desc' }
    });
    if (attLog) {
      await prisma.attendanceLogs.update({
        where: { LogID: attLog.LogID },
        data: { Status: 'APPROVED_BY_MANAGER' }
      });
    }

    res.json({
      success: true,
      message: `Punch-in approved! 4-Digit Code generated: ${code}. Employee will enter this code in WMS to start duty.`,
      dutyId: updated.DutyID,
      approvalCode: code
    });
  } catch (err) {
    console.error('Duty approval error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Manager Rejects Punch-In
app.post('/api/admin/duty-reject', async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const { dutyId, reason } = req.body;

    const updated = await prisma.dutyRecords.update({
      where: { DutyID: Number(dutyId) },
      data: {
        ApprovalStatus: 'REJECTED',
        Notes: reason || 'Punch-in rejected by floor manager'
      }
    });

    res.json({ success: true, message: 'Punch-in rejected', record: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Force Checkout (Manager ends duty session immediately)
app.post('/api/admin/duty-force-checkout', async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const { dutyId, userId, reason } = req.body;

    let targetDuty = null;
    if (dutyId) {
      targetDuty = await prisma.dutyRecords.findUnique({
        where: { DutyID: Number(dutyId) }
      });
    } else if (userId) {
      targetDuty = await prisma.dutyRecords.findFirst({
        where: { UserID: Number(userId), ApprovalStatus: { in: ['ACTIVE', 'APPROVED', 'PENDING_APPROVAL'] } },
        orderBy: { DutyID: 'desc' }
      });
    }

    if (!targetDuty) {
      return res.status(404).json({ success: false, error: 'No active duty record found for checkout' });
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString();
    const punchInDate = targetDuty.CreatedAt ? new Date(targetDuty.CreatedAt) : now;
    const hours = Math.max(0.2, parseFloat(((now.getTime() - punchInDate.getTime()) / (1000 * 60 * 60)).toFixed(1)));

    const updated = await prisma.dutyRecords.update({
      where: { DutyID: targetDuty.DutyID },
      data: {
        ApprovalStatus: 'COMPLETED',
        PunchOutTime: timeStr,
        TotalHours: hours,
        Notes: `${targetDuty.Notes || ''} | Force Checked-Out by Manager at ${timeStr}. Reason: ${reason || 'Manager manual checkout'}`.trim()
      }
    });

    // Update AttendanceLogs
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const attLog = await prisma.attendanceLogs.findFirst({
      where: { StaffID: targetDuty.StaffID, Date: { gte: today } },
      orderBy: { LogID: 'desc' }
    });
    if (attLog) {
      await prisma.attendanceLogs.update({
        where: { LogID: attLog.LogID },
        data: { CheckOut: timeStr, Status: 'FORCE_CHECKOUT' }
      });
    }

    // Set User offline
    await prisma.users.update({
      where: { UserID: targetDuty.UserID },
      data: { IsOnline: false }
    });

    // Realtime Socket.io Sync to WMS
    try {
      const wmsBase = process.env.WMS_URL || 'http://wms:3001';
      await fetch(`${wmsBase}/api/auth/socket-broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'wms:force_checkout',
          userId: targetDuty.UserID,
          message: `Floor Lead has performed Force Checkout (Punch Out). Duty is now OFF.`,
          reason: reason || 'Manager manual checkout',
          duty: updated
        })
      });
    } catch (e) {
      console.warn('WMS socket broadcast error:', e.message);
    }

    res.json({
      success: true,
      message: `Employee force checked-out successfully! Logged duty: ${hours} hrs.`,
      duty: updated
    });
  } catch (err) {
    console.error('Force checkout error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Force Logout (Manager terminates employee mobile session)
app.post('/api/admin/duty-force-logout', async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const { userId, dutyId, reason } = req.body;
    let targetUserId = userId;

    if (!targetUserId && dutyId) {
      const duty = await prisma.dutyRecords.findUnique({
        where: { DutyID: Number(dutyId) }
      });
      if (duty) targetUserId = duty.UserID;
    }

    if (!targetUserId) {
      return res.status(400).json({ success: false, error: 'User ID or Duty ID is required' });
    }

    // Set user offline
    await prisma.users.update({
      where: { UserID: Number(targetUserId) },
      data: { IsOnline: false }
    });

    // If dutyId provided, log note on dutyRecord
    if (dutyId) {
      await prisma.dutyRecords.update({
        where: { DutyID: Number(dutyId) },
        data: {
          Notes: `Force Logged Out by Floor Lead. Reason: ${reason || 'Administrative termination'}`
        }
      });
    }

    // Realtime Socket.io Sync to WMS
    try {
      const wmsBase = process.env.WMS_URL || 'http://wms:3001';
      await fetch(`${wmsBase}/api/auth/socket-broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'wms:force_logout',
          userId: Number(targetUserId),
          message: 'Your active session has been terminated by the Floor Lead / Admin.',
          reason: reason || 'Manager force logout'
        })
      });
    } catch (e) {
      console.warn('WMS socket broadcast error:', e.message);
    }

    res.json({
      success: true,
      message: 'Employee session terminated. Force logout command issued successfully.'
    });
  } catch (err) {
    console.error('Force logout error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// STAFF PAYOUT MANAGEMENT APIS (SUPERADMIN & MANAGER)
// ==========================================

// 1. Get Payout Records (Separated by Role: Picker vs Manager vs Others)
app.get('/api/admin/payouts', async (req, res) => {
  try {
    const { role } = req.query; // 'picker', 'manager', 'packer', or 'all'
    const where = {};
    if (role && role !== 'all') {
      where.Role = { equals: role, mode: 'insensitive' };
    }

    let payouts = await prisma.staffPayouts.findMany({
      where,
      orderBy: { PayoutID: 'desc' },
      take: 100
    });

    // If no payouts in database yet, generate seed demo payouts for pickers and managers
    if (payouts.length === 0) {
      const users = await prisma.users.findMany({
        where: { Role: { in: ['picker', 'manager', 'packer', 'putter'] } }
      });

      for (const u of users) {
        const isMgr = (u.Role || '').toLowerCase() === 'manager';
        await prisma.staffPayouts.create({
          data: {
            StaffID: 1,
            UserID: u.UserID,
            Role: u.Role.toLowerCase(),
            TotalShifts: isMgr ? 26 : 24,
            TotalHours: isMgr ? 208 : 192,
            BasePay: isMgr ? 35000.0 : 18000.0,
            Incentive: isMgr ? 5000.0 : 3600.0,
            TotalAmount: isMgr ? 40000.0 : 21600.0,
            Status: 'PENDING',
            Notes: isMgr ? 'Monthly Manager Supervisor Payout' : 'Picker Completed Orders & Shift Incentive Payout'
          }
        });
      }

      payouts = await prisma.staffPayouts.findMany({
        where,
        orderBy: { PayoutID: 'desc' }
      });
    }

    const enriched = await Promise.all(
      payouts.map(async (p) => {
        const user = await prisma.users.findUnique({
          where: { UserID: p.UserID },
          select: { UserNameFirst: true, UserNameLast: true, Mobile: true, Email: true }
        });

        return {
          payoutId: p.PayoutID,
          userId: p.UserID,
          staffId: p.StaffID,
          employeeName: user ? `${user.UserNameFirst} ${user.UserNameLast || ''}`.trim() : `Staff #${p.UserID}`,
          employeeMobile: user?.Mobile || 'N/A',
          role: p.Role,
          totalShifts: p.TotalShifts,
          totalHours: p.TotalHours,
          basePay: p.BasePay,
          incentive: p.Incentive,
          totalAmount: p.TotalAmount,
          status: p.Status,
          paymentMethod: p.PaymentMethod,
          paymentRef: p.PaymentRef,
          paidAt: p.PaidAt,
          notes: p.Notes,
          createdAt: p.CreatedAt
        };
      })
    );

    // Compute separate role totals for Superadmin
    const allPayouts = await prisma.staffPayouts.findMany();
    const pickerTotal = allPayouts.filter(p => p.Role === 'picker').reduce((sum, p) => sum + p.TotalAmount, 0);
    const managerTotal = allPayouts.filter(p => p.Role === 'manager').reduce((sum, p) => sum + p.TotalAmount, 0);
    const otherTotal = allPayouts.filter(p => !['picker', 'manager'].includes(p.Role)).reduce((sum, p) => sum + p.TotalAmount, 0);

    res.json({
      success: true,
      payouts: enriched,
      stats: {
        grandTotal: allPayouts.reduce((sum, p) => sum + p.TotalAmount, 0),
        pickerTotal,
        managerTotal,
        otherTotal,
        pendingCount: allPayouts.filter(p => p.Status === 'PENDING').length,
        paidCount: allPayouts.filter(p => p.Status === 'PAID').length
      }
    });
  } catch (err) {
    console.error('Payouts fetch error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Mark Payout as PAID
app.post('/api/admin/payout-pay', async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const { payoutId, paymentMethod, paymentRef, notes } = req.body;

    const updated = await prisma.staffPayouts.update({
      where: { PayoutID: Number(payoutId) },
      data: {
        Status: 'PAID',
        PaymentMethod: paymentMethod || 'BANK_TRANSFER',
        PaymentRef: paymentRef || `TXN-${Date.now().toString().slice(-8)}`,
        PaidAt: new Date(),
        ProcessedByID: authUser?.UserID || 1,
        Notes: notes || 'Paid by Superadmin'
      }
    });

    res.json({ success: true, message: `Payout #${payoutId} marked as PAID successfully.`, payout: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Create Custom / Manual Payout Entry
app.post('/api/admin/payout-create', async (req, res) => {
  try {
    const { userId, role, basePay, incentive, totalShifts, totalHours, notes } = req.body;

    const bPay = parseFloat(basePay) || 0;
    const inc = parseFloat(incentive) || 0;
    const total = bPay + inc;

    const created = await prisma.staffPayouts.create({
      data: {
        StaffID: 1,
        UserID: Number(userId),
        Role: (role || 'staff').toLowerCase(),
        TotalShifts: Number(totalShifts) || 1,
        TotalHours: parseFloat(totalHours) || 8.0,
        BasePay: bPay,
        Incentive: inc,
        TotalAmount: total,
        Status: 'PENDING',
        Notes: notes || 'Manually created payout record'
      }
    });

    res.json({ success: true, message: 'Payout record created successfully', payout: created });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


async function startServer() {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    csrfPrevention: false,
  });

  await server.start();

  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req }) => {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (token) {
          try {
            const user = jwt.verify(token, JWT_SECRET);
            return { user };
          } catch (err) {
            return { user: null };
          }
        }
        return { user: null };
      },
    })
  );

  // Serve index.html for all routes (SPA support)
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`GraphQL endpoint: http://localhost:${PORT}/graphql`);
  });
}

startServer().catch(console.error);
