import { Router } from 'express';
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/user.controller';
import { protect, adminOnly } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication and admin access
router.use(protect);
router.use(adminOnly);

router.route('/')
  .get(getUsers)
  .post(createUser);

router.route('/:id')
  .get(getUser)
  .put(updateUser)
  .delete(deleteUser);

export default router;
