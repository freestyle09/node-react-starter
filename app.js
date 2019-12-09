const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const multer = require('multer');
const morgan = require('morgan');
const moongose = require('mongoose');

// Upload files
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, './uploads/');
  },
  filename: function(req, file, cb) {
    cb(null, new Date().toISOString() + file.originalname);
  },
});

const upload = multer({storage});

// Connect to MongoDB
moongose
  .connect('mongodb://localhost:27017/admin')
  .then(() => console.log('Conntected to mongoDB...'))
  .catch(err => console.log('Could not connect to the mongodb...'));

app.use(bodyParser.json());
// app.use(morgan());

app.post('/api/data', upload.any(), (req, res) => {
  console.log(req.files);
  res.send({...req.body, ...req.files});
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server is listening on ${PORT} port...`));
