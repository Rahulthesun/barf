import { Router } from 'express';
import { downloadController } from '../controllers/downloadController';

const router = Router();

router.get('/:buildId', downloadController);

export default router;
