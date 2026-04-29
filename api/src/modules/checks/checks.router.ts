import { Router } from 'express';
import * as controller from './checks.controller';
import { requirePermission } from '../../middlewares/permissions';
import { validateBody } from '../../middlewares/validate';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { CreateCheckSchema, DepositCheckSchema, BounceCheckSchema, EndorseCheckSchema } from './checks.schema';

const router = Router();

router.get('/portfolio', requirePermission(PERMISSIONS.CHECKS.VIEW), controller.portfolio);
router.get('/summary', requirePermission(PERMISSIONS.CHECKS.VIEW), controller.getSummary);
router.get('/', requirePermission(PERMISSIONS.CHECKS.VIEW), controller.getAll);
router.get('/:id', requirePermission(PERMISSIONS.CHECKS.VIEW), controller.getById);
router.post('/', requirePermission(PERMISSIONS.CHECKS.CREATE), validateBody(CreateCheckSchema), controller.create);
router.post('/:id/deposit', requirePermission(PERMISSIONS.CHECKS.DEPOSIT), validateBody(DepositCheckSchema), controller.deposit);
router.post('/:id/clear', requirePermission(PERMISSIONS.CHECKS.CLEAR), controller.clear);
router.post('/:id/bounce', requirePermission(PERMISSIONS.CHECKS.BOUNCE), validateBody(BounceCheckSchema), controller.bounce);
router.post('/:id/endorse', requirePermission(PERMISSIONS.CHECKS.ENDORSE), validateBody(EndorseCheckSchema), controller.endorse);
router.post('/:id/return', requirePermission(PERMISSIONS.CHECKS.RETURN), controller.returnToCustomer);
router.post('/:id/cancel', requirePermission(PERMISSIONS.CHECKS.CANCEL), controller.cancel);

export default router;
