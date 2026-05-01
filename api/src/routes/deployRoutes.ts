import { Router } from 'express';
import { listDeployments, createDeployment, getDeploymentStatus } from '../controllers/deployController';

const router = Router();

router.get('/',     listDeployments);
router.post('/',    createDeployment);
router.get('/:id',  getDeploymentStatus);

export default router;
