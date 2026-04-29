import { Router } from 'express';
import * as controller from './search.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateQuery } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { SearchQuerySchema } from './search.schema';

const router = Router();

router.get(
  '/',
  requirePermission(PERMISSIONS.SEARCH.VIEW),
  validateQuery(SearchQuerySchema),
  controller.search
);

export default router;
