import { Router } from 'express';
import * as controller from './withholdings.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreateWithholdingSchema, ImportPadronesSchema } from './withholdings.schema';

const router = Router();

router.get('/padrones/lookup', requirePermission(PERMISSIONS.WITHHOLDING_PADRONES.LOOKUP), controller.lookupPadron);
router.post('/padrones/import', requirePermission(PERMISSIONS.WITHHOLDING_PADRONES.IMPORT), validateBody(ImportPadronesSchema), controller.importPadrones);

router.get('/', requirePermission(PERMISSIONS.WITHHOLDINGS.VIEW), controller.getAll);
router.get('/:id', requirePermission(PERMISSIONS.WITHHOLDINGS.VIEW), controller.getById);
router.post('/', requirePermission(PERMISSIONS.WITHHOLDINGS.CREATE), validateBody(CreateWithholdingSchema), controller.create);
router.put('/:id', requirePermission(PERMISSIONS.WITHHOLDINGS.UPDATE), controller.update);
router.delete('/:id', requirePermission(PERMISSIONS.WITHHOLDINGS.DELETE), controller.remove);

export default router;
