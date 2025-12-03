import { Router } from 'express';
import { protect, adminOnly, adminOrModerator } from '../middleware/auth.middleware';
import Category from '../models/Category.model';
import Product from '../models/Product.model';
import { logAction } from '../utils/actionLogger';

const router = Router();

// Public routes

/**
 * @desc    Get all categories
 * @route   GET /api/categories
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

/**
 * @desc    Get products by category slug
 * @route   GET /api/categories/:slug/products
 * @access  Public
 */
router.get('/:slug/products', async (req, res) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug });

    if (!category) {
      res.status(404).json({
        success: false,
        message: 'Category not found',
      });
      return;
    }

    const products = await Product.find({
      category: category._id,
      status: 'available',
    })
      .populate('category', 'name slug')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      category,
      count: products.length,
      data: products,
    });
  } catch (error) {
    console.error('Get products by category error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// Protected routes (Admin & Moderator)

/**
 * @desc    Create category
 * @route   POST /api/categories
 * @access  Private/Admin & Moderator
 */
router.post('/', protect, adminOrModerator, async (req, res) => {
  try {
    const { name, image } = req.body;

    if (!name?.en || !name?.my) {
      res.status(400).json({
        success: false,
        message: 'Both English and Burmese names are required',
      });
      return;
    }

    const category = await Category.create({
      name,
      image: image || '',
      createdBy: req.user!._id,
    });

    await logAction({
      userId: req.user!._id,
      action: 'CREATE_CATEGORY',
      targetType: 'category',
      targetId: category._id,
      targetName: category.name.en,
      req,
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category,
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

/**
 * @desc    Update category
 * @route   PUT /api/categories/:id
 * @access  Private/Admin & Moderator
 */
router.put('/:id', protect, adminOrModerator, async (req, res) => {
  try {
    const { name, image } = req.body;

    const category = await Category.findById(req.params.id);

    if (!category) {
      res.status(404).json({
        success: false,
        message: 'Category not found',
      });
      return;
    }

    if (name) category.name = name;
    if (image !== undefined) category.image = image;

    await category.save();

    await logAction({
      userId: req.user!._id,
      action: 'UPDATE_CATEGORY',
      targetType: 'category',
      targetId: category._id,
      targetName: category.name.en,
      details: { updatedFields: Object.keys(req.body) },
      req,
    });

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: category,
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

/**
 * @desc    Delete category
 * @route   DELETE /api/categories/:id
 * @access  Private/Admin only
 */
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      res.status(404).json({
        success: false,
        message: 'Category not found',
      });
      return;
    }

    // Check if category has products
    const productCount = await Product.countDocuments({ category: category._id });
    if (productCount > 0) {
      res.status(400).json({
        success: false,
        message: `Cannot delete category with ${productCount} products. Remove or reassign products first.`,
      });
      return;
    }

    await logAction({
      userId: req.user!._id,
      action: 'DELETE_CATEGORY',
      targetType: 'category',
      targetId: category._id,
      targetName: category.name.en,
      req,
    });

    await Category.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

export default router;
