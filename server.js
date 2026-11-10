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
          select: { UserID: true, UserNameFirst: true, UserNameLast: true, Mobile: true, Email: true, Role: true, ProfileImageUrl: true, IsActive: true }
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
          isActive: user?.IsActive ?? true,
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

    // Also include registered staff from Users who don't have duty records yet
    const allStaffUsers = await prisma.users.findMany({
      where: {
        Role: { in: ['picker', 'putter', 'inward', 'packer', 'manager', 'supervisor', 'incharge', 'superadmin', 'admin'] }
      }
    });

    for (const u of allStaffUsers) {
      if (!employeeMap.has(u.UserID)) {
        if (!role || role === 'all' || u.Role.toLowerCase() === role.toLowerCase()) {
          employeeMap.set(u.UserID, {
            dutyId: null,
            userId: u.UserID,
            staffId: u.UserID,
            employeeName: `${u.UserNameFirst} ${u.UserNameLast || ''}`.trim() || u.Email,
            employeeMobile: u.Mobile || 'N/A',
            employeeRole: u.Role,
            profileImage: u.ProfileImageUrl || null,
            isActive: u.IsActive ?? true,
            shiftSlot: 'General Slot',
            date: new Date(),
            punchInTime: null,
            punchOutTime: null,
            selfieUrl: null,
            approvalStatus: 'OFF_DUTY',
            approvalCode: null,
            approvedByName: null,
            approvedAt: null,
            totalHours: 0,
            notes: 'Awaiting Punch-In',
            totalShifts: 0,
            history: []
          });
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

// Unified Manager 3-Dot Actions: checkout, forcecheckin, id-terminate, id-disable, id-active
app.post('/api/admin/duty-action', async (req, res) => {
  try {
    const { action, userId, dutyId, reason } = req.body;
    if (!action || !userId) {
      return res.status(400).json({ success: false, message: 'Action and User ID are required.' });
    }

    const uId = parseInt(userId);
    const user = await prisma.users.findUnique({ where: { UserID: uId } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const now = new Date();
    const timeStr = now.toLocaleTimeString();

    if (action === 'checkout') {
      const activeDuty = await prisma.dutyRecords.findFirst({
        where: { UserID: uId, ApprovalStatus: { in: ['ACTIVE', 'APPROVED', 'PENDING_APPROVAL'] } },
        orderBy: { DutyID: 'desc' }
      });

      if (activeDuty) {
        const hours = Math.max(0.2, parseFloat(((now.getTime() - new Date(activeDuty.CreatedAt).getTime()) / (1000 * 60 * 60)).toFixed(1)));
        await prisma.dutyRecords.update({
          where: { DutyID: activeDuty.DutyID },
          data: {
            ApprovalStatus: 'COMPLETED',
            PunchOutTime: timeStr,
            TotalHours: hours,
            Notes: `Checked out by Admin at ${timeStr}`
          }
        });
      }

      await prisma.users.update({ where: { UserID: uId }, data: { IsOnline: false } });
      return res.json({ success: true, message: `Staff #${uId} (${user.UserNameFirst}) checked out successfully.` });
    }

    if (action === 'forcecheckin') {
      let staff = await prisma.staff.findFirst({ where: { UserID: uId } });
      if (!staff) {
        staff = await prisma.staff.create({ data: { UserID: uId, StoreID: 6, RoleID: 1, Status: 'ACTIVE' } });
      }

      let activeDuty = await prisma.dutyRecords.findFirst({
        where: { UserID: uId, ApprovalStatus: { in: ['PENDING_APPROVAL', 'APPROVED'] } },
        orderBy: { DutyID: 'desc' }
      });

      if (activeDuty) {
        await prisma.dutyRecords.update({
          where: { DutyID: activeDuty.DutyID },
          data: {
            ApprovalStatus: 'ACTIVE',
            PunchInTime: activeDuty.PunchInTime || timeStr,
            Notes: `Force Check-in Approved by Admin at ${timeStr}`
          }
        });
      } else {
        await prisma.dutyRecords.create({
          data: {
            StaffID: staff.StaffID,
            UserID: uId,
            ShiftSlot: 'General Slot',
            Date: now,
            PunchInTime: timeStr,
            ApprovalStatus: 'ACTIVE',
            ApprovalCode: String(Math.floor(1000 + Math.random() * 9000)),
            Notes: `Force Check-in Created by Admin at ${timeStr}`
          }
        });
      }

      await prisma.users.update({ where: { UserID: uId }, data: { IsOnline: true } });
      return res.json({ success: true, message: `Staff #${uId} (${user.UserNameFirst}) force checked-in to active duty!` });
    }

    if (action === 'id-terminate') {
      await prisma.dutyRecords.updateMany({
        where: { UserID: uId, ApprovalStatus: { in: ['ACTIVE', 'APPROVED', 'PENDING_APPROVAL'] } },
        data: {
          ApprovalStatus: 'REJECTED',
          Notes: `Duty terminated by Manager/Admin at ${timeStr}. Reason: ${reason || 'Administrative Action'}`
        }
      });
      await prisma.users.update({ where: { UserID: uId }, data: { IsOnline: false } });
      return res.json({ success: true, message: `Staff #${uId} (${user.UserNameFirst}) duty terminated.` });
    }

    if (action === 'id-disable') {
      await prisma.users.update({ where: { UserID: uId }, data: { IsActive: false, IsOnline: false } });
      await prisma.dutyRecords.updateMany({
        where: { UserID: uId, ApprovalStatus: { in: ['ACTIVE', 'APPROVED', 'PENDING_APPROVAL'] } },
        data: { ApprovalStatus: 'COMPLETED', PunchOutTime: timeStr }
      });
      return res.json({ success: true, message: `User ID #${uId} (${user.UserNameFirst}) account disabled.` });
    }

    if (action === 'id-active') {
      await prisma.users.update({ where: { UserID: uId }, data: { IsActive: true } });
      return res.json({ success: true, message: `User ID #${uId} (${user.UserNameFirst}) account activated.` });
    }

    return res.status(400).json({ success: false, message: `Unknown action '${action}'` });
  } catch (err) {
    console.error('Duty action error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Detailed Staff Activity & Duty Session Breakdown (/admin/duty-records/:id/details)
app.get('/api/admin/duty-records/:id/details', async (req, res) => {
  try {
    const rawId = parseInt(req.params.id);
    if (isNaN(rawId)) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    let duty = await prisma.dutyRecords.findUnique({ where: { DutyID: rawId } });
    let targetUserId = duty ? duty.UserID : rawId;

    if (!duty) {
      duty = await prisma.dutyRecords.findFirst({
        where: { UserID: targetUserId },
        orderBy: { DutyID: 'desc' }
      });
    }

    const user = await prisma.users.findUnique({
      where: { UserID: targetUserId },
      select: { UserID: true, UserNameFirst: true, UserNameLast: true, Mobile: true, Email: true, Role: true, ProfileImageUrl: true, IsActive: true, IsOnline: true }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Employee user not found.' });
    }

    const now = new Date();
    let dutyDurationText = 'Not Started';
    let dutyStartTime = duty?.PunchInTime || null;
    if (duty && duty.PunchInTime) {
      const startTime = duty.CreatedAt ? new Date(duty.CreatedAt) : now;
      const diffMs = Math.max(0, now.getTime() - startTime.getTime());
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      dutyDurationText = `${diffHours} hr ${diffMins} min (Since ${duty.PunchInTime})`;
    }

    // 1. Putaway Movements
    const putawayMovements = await prisma.stockMovements.findMany({
      where: {
        CreatedBy: targetUserId,
        OR: [
          { Type: 'PUTAWAY' },
          { Type: { contains: 'PUT', mode: 'insensitive' } }
        ]
      },
      orderBy: { Date: 'desc' },
      take: 100
    });

    const placedItems = [];
    let totalPlacedQty = 0;
    for (const m of putawayMovements) {
      totalPlacedQty += (m.Qty || 0);
      let v = null;
      let p = null;
      try {
        v = await prisma.variants.findUnique({ where: { VariantID: m.VariantID } });
        if (v) p = await prisma.products.findUnique({ where: { ProductID: v.ProductID } });
      } catch (e) {}

      placedItems.push({
        movementId: m.MovementID,
        variantId: m.VariantID,
        productName: p ? p.ProductName : (v ? v.SKU : `Item #${m.VariantID}`),
        sku: v ? v.SKU : '',
        unit: v ? v.Unit : 'PCS',
        outShelf: m.FromShelf || 'FL01',
        inShelf: m.ToShelf || 'N/A',
        qty: m.Qty || 0,
        time: m.Date,
        status: m.Status || 'COMPLETED'
      });
    }

    // Floor items remaining
    const floorStores = await prisma.stores.findMany({
      where: {
        OR: [
          { Type: { equals: 'Floor', mode: 'insensitive' } },
          { StoreName: { contains: 'Floor', mode: 'insensitive' } }
        ]
      }
    });
    const floorStoreIds = floorStores.map(s => s.StoreID);
    const floorStocks = await prisma.stocks.findMany({
      where: { StoreID: { in: floorStoreIds }, OnHandQty: { gt: 0 } }
    });

    const pendingFloorItems = [];
    let totalPendingFloorQty = 0;
    for (const fs of floorStocks) {
      totalPendingFloorQty += (fs.OnHandQty || 0);
      let v = null;
      let p = null;
      try {
        v = await prisma.variants.findUnique({ where: { VariantID: fs.VariantID } });
        if (v) p = await prisma.products.findUnique({ where: { ProductID: v.ProductID } });
      } catch (e) {}

      pendingFloorItems.push({
        variantId: fs.VariantID,
        productName: p ? p.ProductName : (v ? v.SKU : `Item #${fs.VariantID}`),
        sku: v ? v.SKU : '',
        unit: v ? v.Unit : 'PCS',
        floorQty: fs.OnHandQty || 0,
        shelfCode: 'FL01'
      });
    }

    // 2. Picking Details
    const pickMovements = await prisma.stockMovements.findMany({
      where: {
        CreatedBy: targetUserId,
        OR: [
          { Type: 'PICK' },
          { Type: { contains: 'PICK', mode: 'insensitive' } }
        ]
      },
      orderBy: { Date: 'desc' },
      take: 100
    });

    const pickedItems = [];
    let totalPickedQty = 0;
    for (const m of pickMovements) {
      totalPickedQty += (m.Qty || 0);
      let v = null;
      let p = null;
      try {
        v = await prisma.variants.findUnique({ where: { VariantID: m.VariantID } });
        if (v) p = await prisma.products.findUnique({ where: { ProductID: v.ProductID } });
      } catch (e) {}

      pickedItems.push({
        movementId: m.MovementID,
        variantId: m.VariantID,
        productName: p ? p.ProductName : (v ? v.SKU : `Item #${m.VariantID}`),
        sku: v ? v.SKU : '',
        fromShelf: m.FromShelf,
        toShelf: m.ToShelf || 'PACKING-BAY',
        qty: m.Qty || 0,
        time: m.Date,
        status: m.Status || 'PICKED'
      });
    }

    const returnCount = await prisma.stockMovements.count({
      where: { CreatedBy: targetUserId, Type: { contains: 'RETURN', mode: 'insensitive' } }
    });
    const transferCount = await prisma.stockMovements.count({
      where: { CreatedBy: targetUserId, Type: { contains: 'TRANSFER', mode: 'insensitive' } }
    });

    let putawayProcessingStatus = placedItems.length > 0 ? 'Active Putaway On Floor' : 'Standby / Idle';
    let pickingProcessingStatus = pickedItems.length > 0 ? 'Active Picking on Aisle' : 'Standby / Awaiting Orders';

    res.json({
      success: true,
      employee: {
        userId: user.UserID,
        name: `${user.UserNameFirst} ${user.UserNameLast || ''}`.trim(),
        role: user.Role,
        mobile: user.Mobile,
        email: user.Email,
        profileImage: user.ProfileImageUrl,
        isActive: user.IsActive,
        isOnline: user.IsOnline
      },
      duty: duty ? {
        dutyId: duty.DutyID,
        shiftSlot: duty.ShiftSlot || 'General Slot',
        punchInTime: duty.PunchInTime,
        punchOutTime: duty.PunchOutTime,
        selfieUrl: duty.SelfieUrl,
        approvalStatus: duty.ApprovalStatus,
        approvalCode: duty.ApprovalCode,
        durationText: dutyDurationText,
        date: duty.Date
      } : {
        dutyId: null,
        shiftSlot: 'General Slot',
        punchInTime: null,
        punchOutTime: null,
        selfieUrl: null,
        approvalStatus: 'OFF_DUTY',
        approvalCode: null,
        durationText: 'Off Duty',
        date: new Date()
      },
      stats: {
        putawayCount: placedItems.length,
        putawayUnits: totalPlacedQty,
        pickingCount: pickedItems.length,
        pickingUnits: totalPickedQty,
        returnsCount: returnCount,
        transfersCount: transferCount
      },
      putaway: {
        since: dutyStartTime,
        duration: dutyDurationText,
        totalPlacedItems: placedItems.length,
        totalPlacedUnits: totalPlacedQty,
        placedItems: placedItems,
        pendingFloorItems: pendingFloorItems,
        totalPendingFloorQty: totalPendingFloorQty,
        currentProcessingStatus: putawayProcessingStatus
      },
      picking: {
        since: dutyStartTime,
        duration: dutyDurationText,
        totalPickedItems: pickedItems.length,
        totalPickedUnits: totalPickedQty,
        pickedItems: pickedItems,
        pendingOrdersCount: 0,
        currentProcessingStatus: pickingProcessingStatus
      }
    });
  } catch (err) {
    console.error('Duty record details fetch error:', err);
    res.status(500).json({ success: false, message: err.message });
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

// Putaway Tasks Audit Log (Floor to Shelf Movements)
app.get('/api/admin/putaway-tasks', async (req, res) => {
  try {
    const movements = await prisma.stockMovements.findMany({
      where: {
        OR: [
          { Type: 'PUTAWAY' },
          { Type: { contains: 'PUT', mode: 'insensitive' } },
          { Reason: { contains: 'Putaway', mode: 'insensitive' } }
        ]
      },
      orderBy: { Date: 'desc' },
      take: 200
    });

    const tasks = [];
    for (const m of movements) {
      let v = null;
      let p = null;
      try {
        v = await prisma.variants.findUnique({ where: { VariantID: m.VariantID } });
        if (v) p = await prisma.products.findUnique({ where: { ProductID: v.ProductID } });
      } catch (e) {}

      tasks.push({
        movementId: m.MovementID,
        pickerId: m.CreatedBy || 1,
        staffName: m.CreatedByName || `Staff #${m.CreatedBy || 1}`,
        time: m.Date,
        outShelf: m.FromShelf || 'FL01',
        inShelf: m.ToShelf || 'N/A',
        itemId: m.VariantID,
        itemName: p ? p.ProductName : (v ? v.SKU : `Item #${m.VariantID}`),
        sku: v ? v.SKU : '',
        unit: v ? v.Unit : 'PCS',
        qty: m.Qty || 0,
        type: m.Type || 'PUTAWAY',
        status: m.Status || 'COMPLETED'
      });
    }

    res.json({ success: true, count: tasks.length, tasks });
  } catch (err) {
    console.error('Error fetching putaway tasks:', err);
    res.status(500).json({ success: false, message: err.message });
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

// ==========================================
// 1. INWARD GOODS RECEIPT LOG FOR STORE & SHELVES (/api/admin/stores/:id/inward-receipts)
// ==========================================
app.get('/api/admin/stores/:storeId/inward-receipts', async (req, res) => {
  try {
    const storeId = parseInt(req.params.storeId);
    if (isNaN(storeId)) {
      return res.status(400).json({ success: false, message: 'Invalid store ID' });
    }

    const store = await prisma.stores.findUnique({
      where: { StoreID: storeId },
      include: { Warehouse: true }
    });

    // 1. Query GRNs for this store
    const grns = await prisma.gRNs.findMany({
      where: { StoreID: storeId },
      include: { Items: true },
      orderBy: { CreatedAt: 'desc' },
      take: 100
    });

    const receipts = [];
    for (const g of grns) {
      let merchantName = 'Direct Vendor';
      try {
        if (g.MerchantID) {
          const m = await prisma.merchants.findUnique({ where: { MerchantID: g.MerchantID } });
          if (m) merchantName = m.Name;
        }
      } catch (e) {}

      let officerName = g.ReceivedByName || 'Officer';
      let officerId = g.ReceivedByID || 'N/A';
      if (!g.ReceivedByName && g.ReceivedByID) {
        try {
          const u = await prisma.users.findUnique({ where: { UserID: g.ReceivedByID } });
          if (u) officerName = `${u.UserNameFirst} ${u.UserNameLast || ''}`.trim();
        } catch (e) {}
      }

      let shelfCode = 'FL01';
      if (g.ShelfID) {
        try {
          const sh = await prisma.shelves.findUnique({ where: { ShelfID: g.ShelfID } });
          if (sh) shelfCode = sh.ShelfCode;
        } catch (e) {}
      }

      for (const it of (g.Items || [])) {
        let v = null;
        try {
          v = await prisma.variants.findUnique({ where: { VariantID: it.VariantID } });
        } catch (e) {}

        receipts.push({
          grnNumber: g.GRNNumber || `GRN-${g.GRNID}`,
          type: g.Type === 'PO' ? 'Against PO' : (g.Type || 'Direct Vendor Receipt'),
          itemName: it.VariantName || (v ? v.SKU : `Item #${it.VariantID}`),
          sku: v ? v.SKU : '',
          qty: it.Qty || 0,
          unit: v ? v.Unit : 'PCS',
          receivedByName: officerName,
          receivedById: officerId,
          receivedAt: g.ReceivedAt ? new Date(g.ReceivedAt).toLocaleString() : (g.CreatedAt ? new Date(g.CreatedAt).toLocaleString() : 'Recent'),
          merchant: merchantName,
          shelfCode: shelfCode,
          remarks: g.Remarks || ''
        });
      }
    }

    // 2. Also check inward stock movements
    const movements = await prisma.stockMovements.findMany({
      where: {
        ToStoreID: storeId,
        OR: [
          { Type: 'INWARD' },
          { Type: 'PURCHASE' },
          { Type: 'INITIAL' },
          { FromShelf: 'VENDOR' },
          { FromShelf: 'VENDOR_DIRECT' }
        ]
      },
      orderBy: { Date: 'desc' },
      take: 50
    });

    for (const m of movements) {
      let v = null;
      let prod = null;
      let officerName = 'Receiving Staff';
      try {
        v = await prisma.variants.findUnique({ where: { VariantID: m.VariantID } });
        if (v) prod = await prisma.products.findUnique({ where: { ProductID: v.ProductID } });
        if (m.CreatedBy) {
          const u = await prisma.users.findUnique({ where: { UserID: m.CreatedBy } });
          if (u) officerName = `${u.UserNameFirst} ${u.UserNameLast || ''}`.trim();
        }
      } catch (e) {}

      receipts.push({
        grnNumber: `REC-${m.MovementID}`,
        type: m.Type || 'Floor Inward Supply',
        itemName: prod ? prod.ProductName : (v ? v.SKU : `Item #${m.VariantID}`),
        sku: v ? v.SKU : '',
        qty: m.Qty || 0,
        unit: v ? v.Unit : 'PCS',
        receivedByName: officerName,
        receivedById: m.CreatedBy || 1,
        receivedAt: m.Date ? new Date(m.Date).toLocaleString() : 'Recent',
        merchant: 'Global Farm / Vendor Supply',
        shelfCode: m.ToShelf || 'FL01',
        remarks: m.Remarks || 'Inward stock placed on floor'
      });
    }

    // Find the latest receipt for floor shelf (FL-01 / FL01 / Floor)
    const floorReceipts = receipts.filter(r => 
      (r.shelfCode || '').toUpperCase().includes('FL') || 
      (r.shelfCode || '').toUpperCase().includes('FLOOR')
    );
    const lastFloorRecord = floorReceipts.length > 0 ? floorReceipts[0] : (receipts[0] || null);

    res.json({
      success: true,
      store: store ? { storeId: store.StoreID, storeName: store.StoreName, type: store.Type } : null,
      lastFloorRecord,
      receipts
    });
  } catch (err) {
    console.error('Inward receipts error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 2. INVENTORY AUDIT & ITEM MOVEMENTS (/api/admin/inventory/movement-audit/:variantId)
// ==========================================
app.get('/api/admin/inventory/movement-audit/:variantId', async (req, res) => {
  try {
    const variantId = parseInt(req.params.variantId);
    if (isNaN(variantId)) {
      return res.status(400).json({ success: false, message: 'Invalid variant ID' });
    }

    const variant = await prisma.variants.findUnique({
      where: { VariantID: variantId }
    });
    if (!variant) {
      return res.status(404).json({ success: false, message: 'Variant not found' });
    }

    const product = await prisma.products.findUnique({
      where: { ProductID: variant.ProductID }
    });

    // 1. Physical Locations & Stock breakdown across stores and shelves
    const stocks = await prisma.stocks.findMany({
      where: { VariantID: variantId }
    });

    const locations = [];
    let totalOnHand = 0;
    let totalAvailable = 0;
    for (const s of stocks) {
      totalOnHand += (s.OnHandQty || 0);
      totalAvailable += (s.AvailableQty || 0);

      let store = null;
      let shelf = null;
      try {
        store = await prisma.stores.findUnique({ where: { StoreID: s.StoreID }, include: { Warehouse: true } });
        if (s.ShelfID) {
          shelf = await prisma.shelves.findUnique({ where: { ShelfID: s.ShelfID } });
        }
      } catch (e) {}

      locations.push({
        stockId: s.StockID,
        storeId: s.StoreID,
        storeName: store ? store.StoreName : `Store #${s.StoreID}`,
        storeType: store ? store.Type : 'Store',
        warehouseName: store?.Warehouse ? store.Warehouse.Name : 'Main WH',
        shelfId: s.ShelfID,
        shelfCode: shelf ? shelf.ShelfCode : (store?.Type === 'Floor' ? 'FL01' : 'Unassigned'),
        onHandQty: s.OnHandQty || 0,
        availableQty: s.AvailableQty || 0,
        reservedQty: s.ReservedQty || 0
      });
    }

    // 2. Movements history (Sale, Transfer, Putaway, Inward, Return)
    const rawMovements = await prisma.stockMovements.findMany({
      where: { VariantID: variantId },
      orderBy: { Date: 'desc' },
      take: 100
    });

    let totalSoldQty = 0;
    const movements = [];
    for (const m of rawMovements) {
      const typeStr = (m.Type || '').toUpperCase();
      if (typeStr === 'SALE' || typeStr === 'OUTBOUND' || typeStr === 'PICKING') {
        totalSoldQty += (m.Qty || 0);
      }

      let officerName = m.CreatedByName || 'System Staff';
      if (m.CreatedBy) {
        try {
          const u = await prisma.users.findUnique({ where: { UserID: m.CreatedBy } });
          if (u) officerName = `${u.UserNameFirst} ${u.UserNameLast || ''}`.trim() + ` (#${u.UserID})`;
        } catch (e) {}
      }

      let fromStoreName = m.FromShelf || 'Floor';
      if (m.FromStoreID) {
        try {
          const fs = await prisma.stores.findUnique({ where: { StoreID: m.FromStoreID } });
          if (fs) fromStoreName = `${fs.StoreName} (${m.FromShelf || 'FL01'})`;
        } catch (e) {}
      }

      let toStoreName = m.ToShelf || 'Customer';
      if (m.ToStoreID) {
        try {
          const ts = await prisma.stores.findUnique({ where: { StoreID: m.ToStoreID } });
          if (ts) toStoreName = `${ts.StoreName} (${m.ToShelf || 'FL01'})`;
        } catch (e) {}
      }

      movements.push({
        movementId: m.MovementID,
        date: m.Date ? new Date(m.Date).toLocaleString() : '—',
        type: m.Type || 'TRANSFER',
        qty: m.Qty || 0,
        from: fromStoreName,
        to: toStoreName,
        officer: officerName,
        remarks: m.Reason || ''
      });
    }

    res.json({
      success: true,
      item: {
        variantId: variant.VariantID,
        productId: variant.ProductID,
        productName: product ? product.ProductName : 'Product',
        sku: variant.SKU,
        specs: [variant.Size, variant.Color].filter(Boolean).join(' • ') || 'Standard',
        unit: variant.Unit || 'PCS',
        unitCost: variant.CostPrice || 0,
        salePrice: variant.SalePrice || 0,
        totalOnHand,
        totalAvailable,
        soldQty: totalSoldQty
      },
      locations,
      movements
    });
  } catch (err) {
    console.error('Inventory movement audit error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 3. INVENTORY STOCK RECONCILIATION & CHECK (/api/admin/inventory/audit-adjust)
// ==========================================
app.post('/api/admin/inventory/audit-adjust', async (req, res) => {
  try {
    const { variantId, storeId, shelfId, oldQty, newQty, auditorName, auditorId, notes } = req.body;
    if (!variantId || storeId === undefined || newQty === undefined) {
      return res.status(400).json({ success: false, message: 'VariantID, StoreID, and NewQty are required' });
    }

    const vId = parseInt(variantId);
    const sId = parseInt(storeId);
    const countedQty = parseFloat(newQty);
    const previousQty = parseFloat(oldQty) || 0;
    const diff = countedQty - previousQty;

    let stock = await prisma.stocks.findFirst({
      where: { VariantID: vId, StoreID: sId }
    });

    if (stock) {
      await prisma.stocks.update({
        where: { StockID: stock.StockID },
        data: {
          OnHandQty: countedQty,
          AvailableQty: Math.max(0, countedQty - (stock.ReservedQty || 0)),
          ShelfID: shelfId ? parseInt(shelfId) : stock.ShelfID
        }
      });
    } else {
      stock = await prisma.stocks.create({
        data: {
          VariantID: vId,
          StoreID: sId,
          ShelfID: shelfId ? parseInt(shelfId) : null,
          OnHandQty: countedQty,
          AvailableQty: countedQty,
          ReservedQty: 0
        }
      });
    }

    // Log StockMovement for this check
    let shelfCode = 'STOCK';
    if (shelfId) {
      try {
        const sh = await prisma.shelves.findUnique({ where: { ShelfID: parseInt(shelfId) } });
        if (sh) shelfCode = sh.ShelfCode;
      } catch (e) {}
    }

    const timestamp = new Date();
    const parsedAuditorId = parseInt(auditorId);
    await prisma.stockMovements.create({
      data: {
        VariantID: vId,
        FromStoreID: sId,
        ToStoreID: sId,
        FromShelf: shelfCode,
        ToShelf: shelfCode,
        Qty: Math.abs(diff),
        Type: 'INVENTORY_AUDIT_CHECK',
        Date: timestamp,
        CreatedBy: !isNaN(parsedAuditorId) ? parsedAuditorId : 1,
        CreatedByName: auditorName || 'Inventory Officer',
        Reason: `Physical Inventory Count: Porana Stock=${previousQty}, Ab Check Kiya=${countedQty} (Diff: ${diff >= 0 ? '+' : ''}${diff}). Auditor: ${auditorName || 'Admin'} (#${auditorId || 1}). Notes: ${notes || 'Verified & Reconciled'}`
      }
    });

    res.json({
      success: true,
      message: `Stock successfully verified & updated to ${countedQty} units! Difference of ${diff >= 0 ? '+' : ''}${diff} logged.`,
      stock: {
        variantId: vId,
        storeId: sId,
        shelfCode,
        oldQty: previousQty,
        newQty: countedQty,
        auditor: auditorName,
        time: timestamp.toLocaleString()
      }
    });
  } catch (err) {
    console.error('Inventory audit adjust error:', err);
    res.status(500).json({ success: false, message: err.message });
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
