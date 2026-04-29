import { Router } from 'express';
import * as controller from './company.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { UpdateCompanySchema } from './company.schema';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.COMPANY.VIEW), controller.get);
router.put('/', requirePermission(PERMISSIONS.COMPANY.UPDATE), validateBody(UpdateCompanySchema), controller.update);

export default router;
