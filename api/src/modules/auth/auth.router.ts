import { Router } from 'express';
import { validateBody } from '../../middlewares/validate';
import { authLimiter } from '../../middlewares/rate-limit';
import { LoginSchema, RefreshSchema } from './auth.schema';
import * as authController from './auth.controller';

const router = Router();

router.post('/login', authLimiter, validateBody(LoginSchema), authController.login as any);
router.post('/refresh', authLimiter, validateBody(RefreshSchema), authController.refresh as any);

export default router;
