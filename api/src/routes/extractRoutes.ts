import { Router } from 'express';
import { extractFeatures } from '../controllers/extractController';

const router = Router();

router.post('/', extractFeatures);

export default router;
