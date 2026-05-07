import { Router } from 'express';
import {
  listDeployments,
  createDeployment,
  getDeploymentStatus,
  stopDeployment,
  startDeployment,
  keepAlive,
  deleteDeployment,
  redeployDeployment,
} from '../controllers/deployController';
import { deployLimit, pollLimit } from '../middleware/rateLimiter';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

router.get('/',               requireAuth, listDeployments);
router.post('/',              requireAuth, deployLimit, createDeployment);
router.get('/:id',            requireAuth, pollLimit, getDeploymentStatus);
router.post('/:id/stop',      requireAuth, pollLimit, stopDeployment);
router.post('/:id/start',     requireAuth, pollLimit, startDeployment);
router.post('/:id/keepalive', requireAuth, pollLimit, keepAlive);
router.post('/:id/redeploy',  requireAuth, deployLimit, redeployDeployment);
router.delete('/:id',         requireAuth, pollLimit, deleteDeployment);

export default router;
