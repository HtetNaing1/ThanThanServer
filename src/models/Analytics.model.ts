import mongoose, { Document, Schema } from 'mongoose';

export interface IAnalyticsDocument extends Document {
  _id: mongoose.Types.ObjectId;
  date: Date;
  pageViews: number;
  uniqueVisitors: number;
  productViews: Map<string, number>;
  visitorIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

const analyticsSchema = new Schema<IAnalyticsDocument>(
  {
    date: {
      type: Date,
      required: true,
      unique: true,
    },
    pageViews: {
      type: Number,
      default: 0,
    },
    uniqueVisitors: {
      type: Number,
      default: 0,
    },
    productViews: {
      type: Map,
      of: Number,
      default: new Map(),
    },
    visitorIds: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Index for date queries
analyticsSchema.index({ date: -1 });

// Static method to get or create today's analytics
analyticsSchema.statics.getOrCreateToday = async function (): Promise<IAnalyticsDocument> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let analytics = await this.findOne({ date: today });

  if (!analytics) {
    analytics = await this.create({ date: today });
  }

  return analytics;
};

// Static method to increment page view
analyticsSchema.statics.incrementPageView = async function (visitorId?: string): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const update: Record<string, unknown> = {
    $inc: { pageViews: 1 },
  };

  if (visitorId) {
    update.$addToSet = { visitorIds: visitorId };
  }

  await this.findOneAndUpdate(
    { date: today },
    update,
    { upsert: true, new: true }
  );

  // Update unique visitors count
  if (visitorId) {
    await this.findOneAndUpdate(
      { date: today },
      [
        {
          $set: {
            uniqueVisitors: { $size: '$visitorIds' },
          },
        },
      ]
    );
  }
};

// Static method to increment product view
analyticsSchema.statics.incrementProductView = async function (productId: string): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await this.findOneAndUpdate(
    { date: today },
    {
      $inc: { [`productViews.${productId}`]: 1 },
    },
    { upsert: true }
  );
};

const Analytics = mongoose.model<IAnalyticsDocument>('Analytics', analyticsSchema);

export default Analytics;
