import { Router } from 'express';
import { buildController } from '../controllers/buildController';

const router = Router();

router.post('/', buildController);

export default router;
