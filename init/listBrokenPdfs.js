require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const EBook = require('../models/ebook.js');
const ResearchPaper = require('../models/researchPaper.js');

mongoose.connect(process.env.MONGO_URL).then(async () => {
  const ebooks = await EBook.find();
  console.log('\n=== EBooks ===');
  ebooks.forEach(d => console.log(d._id, '|', d.title, '|', d.pdfFile && d.pdfFile.url));

  const papers = await ResearchPaper.find();
  console.log('\n=== Research Papers ===');
  papers.forEach(d => console.log(d._id, '|', d.title, '|', d.pdfFile && d.pdfFile.url));

  await mongoose.disconnect();
});
