import { Router } from 'express';
import {
  listDeployments,
  createDeployment,
  getDeploymentStatus,
  stopDeployment,
  startDeployment,
  keepAlive,
  deleteDeployment,
} from '../controllers/deployController';

const router = Router();

router.get('/',               listDeployments);
router.post('/',              createDeployment);
router.get('/:id',            getDeploymentStatus);
router.post('/:id/stop',      stopDeployment);
router.post('/:id/start',     startDeployment);
router.post('/:id/keepalive', keepAlive);
router.delete('/:id',         deleteDeployment);

export default router;
