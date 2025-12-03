import mongoose, { Document, Schema } from 'mongoose';

export interface IProductDocument extends Document {
  _id: mongoose.Types.ObjectId;
  productId: string;
  name: {
    en: string;
    my: string;
  };
  description: {
    en: string;
    my: string;
  };
  price: number;
  category: mongoose.Types.ObjectId;
  images: string[];
  material: string;
  weight: string;
  status: 'available' | 'sold';
  featured: boolean;
  viewCount: number;
  soldAt: Date | null;
  soldBy: mongoose.Types.ObjectId | null;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProductDocument>(
  {
    productId: {
      type: String,
      unique: true,
      required: true,
    },
    name: {
      en: {
        type: String,
        required: [true, 'English name is required'],
        trim: true,
      },
      my: {
        type: String,
        required: [true, 'Burmese name is required'],
        trim: true,
      },
    },
    description: {
      en: {
        type: String,
        required: [true, 'English description is required'],
        trim: true,
      },
      my: {
        type: String,
        required: [true, 'Burmese description is required'],
        trim: true,
      },
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
    },
    images: {
      type: [String],
      default: [],
    },
    material: {
      type: String,
      required: [true, 'Material is required'],
      trim: true,
    },
    weight: {
      type: String,
      required: [true, 'Weight is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['available', 'sold'],
      default: 'available',
    },
    featured: {
      type: Boolean,
      default: false,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    soldAt: {
      type: Date,
      default: null,
    },
    soldBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for search
productSchema.index({ 'name.en': 'text', 'name.my': 'text', productId: 'text' });

// Static method to generate next product ID
productSchema.statics.generateProductId = async function (): Promise<string> {
  const lastProduct = await this.findOne().sort({ createdAt: -1 });

  if (!lastProduct || !lastProduct.productId) {
    return 'JW-0001';
  }

  const lastIdNumber = parseInt(lastProduct.productId.split('-')[1], 10);
  const nextIdNumber = lastIdNumber + 1;
  return `JW-${nextIdNumber.toString().padStart(4, '0')}`;
};

const Product = mongoose.model<IProductDocument>('Product', productSchema);

export default Product;
