const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const uniqueFilename = `${uniqueSuffix}${path.extname(file.originalname)}`;
    console.log(`📁 Saving file as: ${uniqueFilename}`);
    cb(null, uniqueFilename);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 4 // Maximum 4 files
  },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Images only (jpeg, jpg, png)!'));
    }
  },
});

// Add error handling middleware for multer
upload.errorHandler = (error, req, res, next) => {
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large',
        errors: ['File size must be less than 5MB']
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files',
        errors: ['Maximum 4 files allowed']
      });
    }
  }
  
  if (error.message === 'Images only (jpeg, jpg, png)!') {
    return res.status(400).json({
      success: false,
      message: 'Invalid file type',
      errors: ['Only JPEG, JPG, and PNG images are allowed']
    });
  }
  
  return res.status(500).json({
    success: false,
    message: 'File upload error',
    errors: [error.message || 'Unknown file upload error']
  });
};

module.exports = upload;