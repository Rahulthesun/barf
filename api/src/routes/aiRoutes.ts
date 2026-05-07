import { Router } from 'express';
import { onboardChat } from '../controllers/aiController';
import { chatLimit } from '../middleware/rateLimiter';

const router = Router();

router.post('/onboard', chatLimit, onboardChat);

export default router;
