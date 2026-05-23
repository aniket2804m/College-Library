require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const EBook = require('../models/ebook.js');
const ResearchPaper = require('../models/researchPaper.js');

mongoose.connect(process.env.MONGO_URL).then(async () => {
  const e = await EBook.deleteMany({ 'pdfFile.url': { $regex: '/image/upload/' } });
  console.log(`Deleted ${e.deletedCount} broken ebook(s)`);

  const r = await ResearchPaper.deleteMany({ 'pdfFile.url': { $regex: '/image/upload/' } });
  console.log(`Deleted ${r.deletedCount} broken research paper(s)`);

  await mongoose.disconnect();
  console.log('Done. Re-upload the PDFs from the admin panel.');
});
