const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { upload } = require('../middleware/upload');
const { uploadFile, deleteFile } = require('../controllers/fileController');

router.post('/upload', authMiddleware, upload.single('file'), uploadFile);
router.delete('/', authMiddleware, deleteFile);

module.exports = router;
