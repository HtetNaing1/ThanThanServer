import { Router } from 'express';
import { protect, adminOnly, adminOrModerator } from '../middleware/auth.middleware';
import Product from '../models/Product.model';
import Analytics from '../models/Analytics.model';
import { logAction } from '../utils/actionLogger';
import { deleteImage, getPublicIdFromUrl } from '../utils/cloudinary';

const router = Router();

// Helper function to generate product ID
const generateProductId = async (): Promise<string> => {
  const lastProduct = await Product.findOne().sort({ createdAt: -1 });

  if (!lastProduct || !lastProduct.productId) {
    return 'JW-0001';
  }

  const lastIdNumber = parseInt(lastProduct.productId.split('-')[1], 10);
  const nextIdNumber = lastIdNumber + 1;
  return `JW-${nextIdNumber.toString().padStart(4, '0')}`;
};

// Public routes

/**
 * @desc    Get all available products
 * @route   GET /api/products
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const {
      category,
      search,
      sort = 'createdAt',
      order = 'desc',
      page = 1,
      limit = 12,
      status,
    } = req.query;

    const query: Record<string, unknown> = {};

    // Only show available products for public access
    // Admin can see all by passing status param
    if (!status) {
      query.status = 'available';
    } else if (status !== 'all') {
      query.status = status;
    }

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { 'name.en': { $regex: search, $options: 'i' } },
        { 'name.my': { $regex: search, $options: 'i' } },
        { productId: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sortOrder = order === 'asc' ? 1 : -1;

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('category', 'name slug')
        .sort({ [sort as string]: sortOrder })
        .skip(skip)
        .limit(Number(limit)),
      Product.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

/**
 * @desc    Get featured products
 * @route   GET /api/products/featured
 * @access  Public
 */
router.get('/featured', async (req, res) => {
  try {
    const products = await Product.find({ featured: true, status: 'available' })
      .populate('category', 'name slug')
      .sort({ createdAt: -1 })
      .limit(8);

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    console.error('Get featured products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

/**
 * @desc    Get single product
 * @route   GET /api/products/:id
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category', 'name slug');

    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found',
      });
      return;
    }

    // Increment view count
    product.viewCount += 1;
    await product.save();

    // Track product view in analytics
    try {
      await (Analytics as unknown as { incrementProductView: (id: string) => Promise<void> }).incrementProductView(product._id.toString());
    } catch (err) {
      console.error('Failed to track product view:', err);
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

// Protected routes (Admin & Moderator)

/**
 * @desc    Create product
 * @route   POST /api/products
 * @access  Private/Admin & Moderator
 */
router.post('/', protect, adminOrModerator, async (req, res) => {
  try {
    const { name, description, price, category, images, material, weight, featured } = req.body;

    // Validate required fields
    if (!name?.en || !name?.my) {
      res.status(400).json({
        success: false,
        message: 'Both English and Burmese names are required',
      });
      return;
    }

    // Generate product ID
    const productId = await generateProductId();

    const product = await Product.create({
      productId,
      name,
      description,
      price,
      category,
      images: images || [],
      material,
      weight,
      featured: featured || false,
      createdBy: req.user!._id,
    });

    await logAction({
      userId: req.user!._id,
      action: 'CREATE_PRODUCT',
      targetType: 'product',
      targetId: product._id,
      targetName: `${product.productId} - ${product.name.en}`,
      details: { productId: product.productId, price: product.price },
      req,
    });

    const populatedProduct = await Product.findById(product._id).populate('category', 'name slug');

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: populatedProduct,
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

/**
 * @desc    Update product
 * @route   PUT /api/products/:id
 * @access  Private/Admin & Moderator
 */
router.put('/:id', protect, adminOrModerator, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found',
      });
      return;
    }

    const { name, description, price, category, images, material, weight, featured } = req.body;

    if (name) product.name = name;
    if (description) product.description = description;
    if (price !== undefined) product.price = price;
    if (category) product.category = category;
    if (images) product.images = images;
    if (material) product.material = material;
    if (weight) product.weight = weight;
    if (featured !== undefined) product.featured = featured;

    await product.save();

    await logAction({
      userId: req.user!._id,
      action: 'UPDATE_PRODUCT',
      targetType: 'product',
      targetId: product._id,
      targetName: `${product.productId} - ${product.name.en}`,
      details: { updatedFields: Object.keys(req.body) },
      req,
    });

    const populatedProduct = await Product.findById(product._id).populate('category', 'name slug');

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: populatedProduct,
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

/**
 * @desc    Mark product as sold
 * @route   PATCH /api/products/:id/sold
 * @access  Private/Admin & Moderator
 */
router.patch('/:id/sold', protect, adminOrModerator, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found',
      });
      return;
    }

    if (product.status === 'sold') {
      res.status(400).json({
        success: false,
        message: 'Product is already marked as sold',
      });
      return;
    }

    product.status = 'sold';
    product.soldAt = new Date();
    product.soldBy = req.user!._id;

    await product.save();

    await logAction({
      userId: req.user!._id,
      action: 'MARK_SOLD',
      targetType: 'product',
      targetId: product._id,
      targetName: `${product.productId} - ${product.name.en}`,
      details: { price: product.price },
      req,
    });

    res.status(200).json({
      success: true,
      message: 'Product marked as sold',
      data: product,
    });
  } catch (error) {
    console.error('Mark sold error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

/**
 * @desc    Delete product
 * @route   DELETE /api/products/:id
 * @access  Private/Admin only
 */
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      res.status(404).json({
        success: false,
        message: 'Product not found',
      });
      return;
    }

    // Delete images from Cloudinary
    for (const imageUrl of product.images) {
      const publicId = getPublicIdFromUrl(imageUrl);
      if (publicId) {
        await deleteImage(publicId);
      }
    }

    await logAction({
      userId: req.user!._id,
      action: 'DELETE_PRODUCT',
      targetType: 'product',
      targetId: product._id,
      targetName: `${product.productId} - ${product.name.en}`,
      details: { productId: product.productId, price: product.price },
      req,
    });

    await Product.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

export default router;
