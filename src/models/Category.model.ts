import mongoose, { Document, Schema } from 'mongoose';
import slugify from 'slugify';

export interface ICategoryDocument extends Document {
  _id: mongoose.Types.ObjectId;
  name: {
    en: string;
    my: string;
  };
  slug: string;
  image: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategoryDocument>(
  {
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
    slug: {
      type: String,
      unique: true,
    },
    image: {
      type: String,
      default: '',
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

// Generate slug before saving
categorySchema.pre('save', function () {
  if (this.isModified('name.en')) {
    this.slug = slugify(this.name.en, { lower: true, strict: true });
  }
});

const Category = mongoose.model<ICategoryDocument>('Category', categorySchema);

export default Category;
