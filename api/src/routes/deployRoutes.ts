import { Router } from 'express';
import { listDeployments, createDeployment, getDeploymentStatus, deleteDeployment } from '../controllers/deployController';

const router = Router();

router.get('/',        listDeployments);
router.post('/',       createDeployment);
router.get('/:id',     getDeploymentStatus);
router.delete('/:id',  deleteDeployment);

export default router;
