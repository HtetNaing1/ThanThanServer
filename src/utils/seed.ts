import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.model';

dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to MongoDB');

    // Check if admin exists
    const existingAdmin = await User.findOne({ role: 'admin' });

    if (existingAdmin) {
      console.log('Admin user already exists:');
      console.log(`  Email: ${existingAdmin.email}`);
      console.log('  Password: (use existing password)');
    } else {
      // Create default admin
      const admin = await User.create({
        email: 'admin@thanthanjewellery.com',
        password: 'admin123',
        name: 'Admin',
        role: 'admin',
      });

      console.log('Default admin created:');
      console.log(`  Email: ${admin.email}`);
      console.log('  Password: admin123');
      console.log('');
      console.log('⚠️  Please change the password after first login!');
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedAdmin();
