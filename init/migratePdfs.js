/**
 * migratePdfs.js
 * One-time script: re-uploads all existing PDF records from image → raw resource type on Cloudinary.
 * Run once: node init/migratePdfs.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose  = require('mongoose');
const cloudinary = require('cloudinary').v2;
const https   = require('https');
const http    = require('http');
const fs        = require('fs');
const os        = require('os');
const path      = require('path');

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key:    process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

const EBook         = require('../models/ebook.js');
const ResearchPaper = require('../models/researchPaper.js');

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const client = url.startsWith('https') ? https : http;
    client.get(url, res => {
      // Follow redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', err => { fs.unlink(dest, () => {}); reject(err); });
  });
}

async function migrateRecord(id, url, model, field) {
  if (!url || !url.includes('/image/upload/')) {
    console.log(`  ⏭  Already raw or no URL — skipping`);
    return;
  }

  // Extract public_id from the URL (strip version + extension)
  // e.g. https://res.cloudinary.com/xxx/image/upload/v123/folder/filename.pdf
  const match = url.match(/\/image\/upload\/(?:v\d+\/)?(.+)$/);
  if (!match) { console.log(`  ⚠  Could not parse public_id from URL`); return; }
  const publicId = match[1].replace(/\.[^.]+$/, ''); // strip extension

  const tmpFile = path.join(os.tmpdir(), `pdf_migrate_${id}.pdf`);
  try {
    // Generate a signed download URL via Admin API (bypasses image pipeline)
    const signedUrl = cloudinary.url(publicId, {
      resource_type: 'image',
      type: 'upload',
      secure: true,
      sign_url: true,
      attachment: true,
      expires_at: Math.floor(Date.now() / 1000) + 300,
    });

    console.log(`  ⬇  Downloading via signed URL...`);
    await downloadFile(signedUrl, tmpFile);

    const stat = fs.statSync(tmpFile);
    if (stat.size < 100) throw new Error(`Downloaded file too small (${stat.size} bytes) — likely not a valid PDF`);

    console.log(`  ⬆  Re-uploading as raw (${stat.size} bytes)...`);
    const result = await cloudinary.uploader.upload(tmpFile, {
      folder:        'wanderlust_DEV/pdfs',
      resource_type: 'raw',
      public_id:     `migrated_${id}`,
      use_filename:  false,
    });

    const newUrl = result.secure_url;
    console.log(`  ✓  New URL: ${newUrl}`);

    const update = {};
    update[`${field}.url`] = newUrl;
    update[`${field}.filename`] = result.public_id;
    await model.findByIdAndUpdate(id, { $set: update });

    // Delete old image-type asset
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' }).catch(() => {});
    console.log(`  🗑  Deleted old image asset`);

  } finally {
    fs.unlink(tmpFile, () => {});
  }
}

async function run() {
  await mongoose.connect(process.env.MONGO_URL);
  console.log('✓ Connected to MongoDB\n');

  // Migrate EBooks
  const ebooks = await EBook.find({ 'pdfFile.url': { $regex: '/image/upload/' } });
  console.log(`Found ${ebooks.length} ebook(s) to migrate`);
  for (const eb of ebooks) {
    console.log(`\nEBook: ${eb.title}`);
    await migrateRecord(eb._id, eb.pdfFile.url, EBook, 'pdfFile');
  }

  // Migrate Research Papers
  const papers = await ResearchPaper.find({ 'pdfFile.url': { $regex: '/image/upload/' } });
  console.log(`\nFound ${papers.length} research paper(s) to migrate`);
  for (const p of papers) {
    console.log(`\nPaper: ${p.title}`);
    await migrateRecord(p._id, p.pdfFile.url, ResearchPaper, 'pdfFile');
  }

  console.log('\n✅ Migration complete!');
  await mongoose.disconnect();
}

run().catch(err => { console.error('Migration failed:', err); process.exit(1); });
