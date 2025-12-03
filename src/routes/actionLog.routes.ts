import { Router } from 'express';
import { protect, adminOnly } from '../middleware/auth.middleware';
import { getActionLogs } from '../utils/actionLogger';
import { ActionType, TargetType } from '../models/ActionLog.model';

const router = Router();

/**
 * @desc    Get action logs
 * @route   GET /api/action-logs
 * @access  Private/Admin
 */
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const {
      userId,
      action,
      targetType,
      startDate,
      endDate,
      page = '1',
      limit = '20',
    } = req.query;

    const filters = {
      userId: userId as string | undefined,
      action: action as ActionType | undefined,
      targetType: targetType as TargetType | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
    };

    const result = await getActionLogs(filters);

    res.status(200).json({
      success: true,
      data: result.logs,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Get action logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

export default router;
