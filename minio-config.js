const Minio = require('minio');

const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT) || 9000,
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'admin',
    secretKey: process.env.MINIO_SECRET_KEY || 'admin123'
});

const bucketName = 'user-image';
const bankBucketName = 'bank-images';
const docBucketName = 'user-documents';
const productBucketName = 'product-images';

// Ensure bucket exists
async function ensureBucketExists(name) {
    try {
        const exists = await minioClient.bucketExists(name);
        if (!exists) {
            await minioClient.makeBucket(name);
            console.log(`Bucket '${name}' created successfully.`);
        } else {
            console.log(`Bucket '${name}' already exists.`);
        }

        // Always set bucket policy to public read for viewing images
        const policy = {
            Version: "2012-10-17",
            Statement: [
                {
                    Effect: "Allow",
                    Principal: "*",
                    Action: ["s3:GetObject"],
                    Resource: [`arn:aws:s3:::${name}/*`]
                }
            ]
        };
        await minioClient.setBucketPolicy(name, JSON.stringify(policy));
        console.log(`✅ Bucket policy enforced to public read for '${name}'.`);
    } catch (err) {
        console.error(`❌ Minio Initialization Error for ${name}:`, err.message);
    }
}

async function initMinio() {
    await ensureBucketExists(bucketName);
    await ensureBucketExists(bankBucketName);
    await ensureBucketExists(docBucketName);
    await ensureBucketExists(productBucketName);
}

initMinio();

module.exports = { minioClient, bucketName, bankBucketName, docBucketName, productBucketName };
