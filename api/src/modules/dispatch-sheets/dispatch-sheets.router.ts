import { Router } from 'express';
import * as controller from './dispatch-sheets.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreateDispatchSheetSchema, UpdateDispatchSheetSchema } from './dispatch-sheets.schema';

const router = Router();

router.get('/', requirePermission(PERMISSIONS.DISPATCH_SHEETS.VIEW), controller.getAll);
router.get('/:id/print-data', requirePermission(PERMISSIONS.DISPATCH_SHEETS.VIEW), controller.getPrintData);
router.get('/:id', requirePermission(PERMISSIONS.DISPATCH_SHEETS.VIEW), controller.getById);
router.post('/', requirePermission(PERMISSIONS.DISPATCH_SHEETS.CREATE), validateBody(CreateDispatchSheetSchema), controller.create);
router.put('/:id', requirePermission(PERMISSIONS.DISPATCH_SHEETS.UPDATE), validateBody(UpdateDispatchSheetSchema), controller.update);
router.post('/:id/print', requirePermission(PERMISSIONS.DISPATCH_SHEETS.PRINT), controller.print);
router.post('/:id/dispatch', requirePermission(PERMISSIONS.DISPATCH_SHEETS.UPDATE), controller.dispatch);
router.post('/:id/close', requirePermission(PERMISSIONS.DISPATCH_SHEETS.CLOSE), controller.close);

export default router;
