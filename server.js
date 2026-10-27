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
    const minioUrl = `${process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http'}://${process.env.MINIO_ENDPOINT || 'localhost'}:${process.env.MINIO_PORT || 9000}/${bucketName}/${fileName}`;
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

    const minioUrl = `${process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http'}://${process.env.MINIO_ENDPOINT || 'localhost'}:${process.env.MINIO_PORT || 9000}/${bankBucketName}/${fileName}`;
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

    const minioUrl = `${process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http'}://${process.env.MINIO_ENDPOINT || 'localhost'}:${process.env.MINIO_PORT || 9000}/${docBucketName}/${fileName}`;
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

    const minioUrl = `${process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http'}://${process.env.MINIO_ENDPOINT || 'localhost'}:${process.env.MINIO_PORT || 9000}/${productBucketName}/${fileName}`;
    console.log(`📸 Catalog image uploaded: ${minioUrl}`);

    res.json({ success: true, imageUrl: minioUrl });
  } catch (err) {
    console.error('Catalog upload error:', err);
    res.status(500).json({ error: 'Upload failed', details: err.message });
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
