import { Router } from 'express';
import multer from 'multer';
import { protect, adminOrModerator } from '../middleware/auth.middleware';
import { uploadImage, deleteImage } from '../utils/cloudinary';
import fs from 'fs';
import path from 'path';

const router = Router();

// Configure multer for temporary file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

/**
 * @desc    Upload single image
 * @route   POST /api/upload
 * @access  Private/Admin & Moderator
 */
router.post('/', protect, adminOrModerator, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No image file provided',
      });
      return;
    }

    const result = await uploadImage(req.file.path, 'thanthanjewellery/products');

    // Delete temporary file
    fs.unlinkSync(req.file.path);

    if (!result.success) {
      res.status(500).json({
        success: false,
        message: result.error || 'Failed to upload image',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        url: result.url,
        publicId: result.publicId,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    // Clean up temp file if exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: 'Server error during upload',
    });
  }
});

/**
 * @desc    Upload multiple images
 * @route   POST /api/upload/multiple
 * @access  Private/Admin & Moderator
 */
router.post('/multiple', protect, adminOrModerator, upload.array('images', 10), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No image files provided',
      });
      return;
    }

    const uploadResults = [];

    for (const file of files) {
      const result = await uploadImage(file.path, 'thanthanjewellery/products');

      // Delete temporary file
      fs.unlinkSync(file.path);

      if (result.success) {
        uploadResults.push({
          url: result.url,
          publicId: result.publicId,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `${uploadResults.length} images uploaded successfully`,
      data: uploadResults,
    });
  } catch (error) {
    console.error('Multiple upload error:', error);
    // Clean up temp files
    const files = req.files as Express.Multer.File[];
    if (files) {
      for (const file of files) {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }
    }
    res.status(500).json({
      success: false,
      message: 'Server error during upload',
    });
  }
});

/**
 * @desc    Delete image
 * @route   DELETE /api/upload
 * @access  Private/Admin & Moderator
 */
router.delete('/', protect, adminOrModerator, async (req, res) => {
  try {
    const { publicId } = req.body;

    if (!publicId) {
      res.status(400).json({
        success: false,
        message: 'Public ID is required',
      });
      return;
    }

    const result = await deleteImage(publicId);

    if (!result.success) {
      res.status(500).json({
        success: false,
        message: result.error || 'Failed to delete image',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

export default router;
