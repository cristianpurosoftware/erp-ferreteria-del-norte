import { Router } from 'express';
import * as controller from './three-way-match.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { OverrideMatchSchema } from './three-way-match.schema';

const router = Router();

router.get('/:id', requirePermission(PERMISSIONS.THREE_WAY_MATCH.VIEW), controller.getById);
router.post('/:id/override', requirePermission(PERMISSIONS.THREE_WAY_MATCH.OVERRIDE), validateBody(OverrideMatchSchema), controller.override);

export default router;
