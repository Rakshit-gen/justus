const mongoose = require('mongoose');
const { GridFSBucket, ObjectId } = require('mongodb');

let cachedBucket = null;
function getBucket() {
  if (cachedBucket) return cachedBucket;
  if (!mongoose.connection?.db) {
    throw new Error('Mongo connection not ready');
  }
  cachedBucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'attachments' });
  return cachedBucket;
}

async function uploadBuffer(buffer, { filename, contentType, metadata }) {
  const bucket = getBucket();
  return new Promise((resolve, reject) => {
    const stream = bucket.openUploadStream(filename || 'file', {
      contentType: contentType || 'application/octet-stream',
      metadata: metadata || {},
    });
    stream.on('error', reject);
    stream.on('finish', () => resolve(stream.id));
    stream.end(buffer);
  });
}

async function getFileInfo(id) {
  const bucket = getBucket();
  const _id = new ObjectId(id);
  const files = await bucket.find({ _id }).toArray();
  return files[0] || null;
}

function openDownloadStream(id) {
  const bucket = getBucket();
  return bucket.openDownloadStream(new ObjectId(id));
}

async function deleteFile(id) {
  const bucket = getBucket();
  try {
    await bucket.delete(new ObjectId(id));
  } catch (err) {
    if (err?.message?.includes('not found')) return;
    throw err;
  }
}

module.exports = { getBucket, uploadBuffer, getFileInfo, openDownloadStream, deleteFile };
