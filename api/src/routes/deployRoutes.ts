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
import { deployLimit, pollLimit } from '../middleware/rateLimiter';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

router.get('/',               listDeployments);
router.post('/',              requireAuth, deployLimit, createDeployment);
router.get('/:id',            pollLimit, getDeploymentStatus);
router.post('/:id/stop',      pollLimit, stopDeployment);
router.post('/:id/start',     pollLimit, startDeployment);
router.post('/:id/keepalive', pollLimit, keepAlive);
router.delete('/:id',         requireAuth, pollLimit, deleteDeployment);

export default router;
