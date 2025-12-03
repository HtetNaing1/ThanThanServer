import { Router } from 'express';
import { protect, adminOnly } from '../middleware/auth.middleware';
import Analytics from '../models/Analytics.model';
import Product from '../models/Product.model';
import Category from '../models/Category.model';
import User from '../models/User.model';

const router = Router();

/**
 * @desc    Track page view (public)
 * @route   POST /api/analytics/pageview
 * @access  Public
 */
router.post('/pageview', async (req, res) => {
  try {
    const { visitorId } = req.body;

    await (Analytics as unknown as { incrementPageView: (id?: string) => Promise<void> }).incrementPageView(visitorId);

    res.status(200).json({
      success: true,
    });
  } catch (error) {
    console.error('Track pageview error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

/**
 * @desc    Get dashboard analytics
 * @route   GET /api/analytics/dashboard
 * @access  Private/Admin
 */
router.get('/dashboard', protect, adminOnly, async (req, res) => {
  try {
    // Get counts
    const [
      totalProducts,
      availableProducts,
      soldProducts,
      totalCategories,
      totalUsers,
    ] = await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ status: 'available' }),
      Product.countDocuments({ status: 'sold' }),
      Category.countDocuments(),
      User.countDocuments(),
    ]);

    // Calculate total sales value
    const salesAggregation = await Product.aggregate([
      { $match: { status: 'sold' } },
      { $group: { _id: null, totalValue: { $sum: '$price' } } },
    ]);
    const totalSalesValue = salesAggregation[0]?.totalValue || 0;

    // Get today's analytics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayAnalytics = await Analytics.findOne({ date: today });

    // Get most viewed products
    const mostViewedProducts = await Product.find()
      .sort({ viewCount: -1 })
      .limit(5)
      .select('productId name viewCount price status');

    // Get recent sales
    const recentSales = await Product.find({ status: 'sold' })
      .sort({ soldAt: -1 })
      .limit(5)
      .select('productId name price soldAt')
      .populate('soldBy', 'name');

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalProducts,
          availableProducts,
          soldProducts,
          totalCategories,
          totalUsers,
          totalSalesValue,
        },
        today: {
          pageViews: todayAnalytics?.pageViews || 0,
          uniqueVisitors: todayAnalytics?.uniqueVisitors || 0,
        },
        mostViewedProducts,
        recentSales,
      },
    });
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

/**
 * @desc    Get sales analytics
 * @route   GET /api/analytics/sales
 * @access  Private/Admin
 */
router.get('/sales', protect, adminOnly, async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period as string, 10);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Daily sales
    const dailySales = await Product.aggregate([
      {
        $match: {
          status: 'sold',
          soldAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$soldAt' },
          },
          count: { $sum: 1 },
          value: { $sum: '$price' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Sales by category
    const salesByCategory = await Product.aggregate([
      {
        $match: {
          status: 'sold',
          soldAt: { $gte: startDate },
        },
      },
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryInfo',
        },
      },
      { $unwind: '$categoryInfo' },
      {
        $group: {
          _id: '$category',
          categoryName: { $first: '$categoryInfo.name.en' },
          count: { $sum: 1 },
          value: { $sum: '$price' },
        },
      },
      { $sort: { value: -1 } },
    ]);

    // Total for period
    const totalForPeriod = await Product.aggregate([
      {
        $match: {
          status: 'sold',
          soldAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          value: { $sum: '$price' },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        period: days,
        total: {
          count: totalForPeriod[0]?.count || 0,
          value: totalForPeriod[0]?.value || 0,
        },
        dailySales,
        salesByCategory,
      },
    });
  } catch (error) {
    console.error('Sales analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

/**
 * @desc    Get traffic analytics
 * @route   GET /api/analytics/traffic
 * @access  Private/Admin
 */
router.get('/traffic', protect, adminOnly, async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period as string, 10);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const trafficData = await Analytics.find({
      date: { $gte: startDate },
    })
      .sort({ date: 1 })
      .select('date pageViews uniqueVisitors');

    // Calculate totals
    const totals = trafficData.reduce(
      (acc, day) => ({
        pageViews: acc.pageViews + day.pageViews,
        uniqueVisitors: acc.uniqueVisitors + day.uniqueVisitors,
      }),
      { pageViews: 0, uniqueVisitors: 0 }
    );

    res.status(200).json({
      success: true,
      data: {
        period: days,
        totals,
        daily: trafficData,
      },
    });
  } catch (error) {
    console.error('Traffic analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

export default router;
