import mongoose, { Document, Schema } from 'mongoose';

export type ActionType =
  | 'CREATE_PRODUCT'
  | 'UPDATE_PRODUCT'
  | 'DELETE_PRODUCT'
  | 'MARK_SOLD'
  | 'CREATE_CATEGORY'
  | 'UPDATE_CATEGORY'
  | 'DELETE_CATEGORY'
  | 'CREATE_USER'
  | 'UPDATE_USER'
  | 'DELETE_USER'
  | 'LOGIN'
  | 'LOGOUT';

export type TargetType = 'product' | 'category' | 'user';

export interface IActionLogDocument extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  action: ActionType;
  targetType: TargetType;
  targetId: mongoose.Types.ObjectId | null;
  targetName: string;
  details: Record<string, unknown>;
  ipAddress: string;
  createdAt: Date;
}

const actionLogSchema = new Schema<IActionLogDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      enum: [
        'CREATE_PRODUCT',
        'UPDATE_PRODUCT',
        'DELETE_PRODUCT',
        'MARK_SOLD',
        'CREATE_CATEGORY',
        'UPDATE_CATEGORY',
        'DELETE_CATEGORY',
        'CREATE_USER',
        'UPDATE_USER',
        'DELETE_USER',
        'LOGIN',
        'LOGOUT',
      ],
      required: true,
    },
    targetType: {
      type: String,
      enum: ['product', 'category', 'user'],
      required: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    targetName: {
      type: String,
      required: true,
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Index for querying
actionLogSchema.index({ user: 1, createdAt: -1 });
actionLogSchema.index({ action: 1, createdAt: -1 });
actionLogSchema.index({ createdAt: -1 });

const ActionLog = mongoose.model<IActionLogDocument>('ActionLog', actionLogSchema);

export default ActionLog;
