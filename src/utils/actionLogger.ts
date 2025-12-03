import { Request } from 'express';
import ActionLog, { ActionType, TargetType } from '../models/ActionLog.model';
import mongoose from 'mongoose';

interface LogActionParams {
  userId: string | mongoose.Types.ObjectId;
  action: ActionType;
  targetType: TargetType;
  targetId?: string | mongoose.Types.ObjectId | null;
  targetName: string;
  details?: Record<string, unknown>;
  req?: Request;
}

/**
 * Log an action to the ActionLog collection
 */
export const logAction = async ({
  userId,
  action,
  targetType,
  targetId = null,
  targetName,
  details = {},
  req,
}: LogActionParams): Promise<void> => {
  try {
    // Get IP address from request
    let ipAddress = '';
    if (req) {
      ipAddress =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
        req.socket.remoteAddress ||
        '';
    }

    await ActionLog.create({
      user: userId,
      action,
      targetType,
      targetId: targetId ? new mongoose.Types.ObjectId(targetId.toString()) : null,
      targetName,
      details,
      ipAddress,
    });
  } catch (error) {
    console.error('Failed to log action:', error);
    // Don't throw - logging should not break the main operation
  }
};

/**
 * Get action logs with filters
 */
export const getActionLogs = async (filters: {
  userId?: string;
  action?: ActionType;
  targetType?: TargetType;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}) => {
  const {
    userId,
    action,
    targetType,
    startDate,
    endDate,
    page = 1,
    limit = 20,
  } = filters;

  const query: Record<string, unknown> = {};

  if (userId) {
    query.user = new mongoose.Types.ObjectId(userId);
  }

  if (action) {
    query.action = action;
  }

  if (targetType) {
    query.targetType = targetType;
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      (query.createdAt as Record<string, Date>).$gte = startDate;
    }
    if (endDate) {
      (query.createdAt as Record<string, Date>).$lte = endDate;
    }
  }

  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    ActionLog.find(query)
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    ActionLog.countDocuments(query),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};
