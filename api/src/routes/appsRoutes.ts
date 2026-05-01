import { Router } from 'express';
import { listApps, listCategories, getApp } from '../controllers/appsController';

const router = Router();

router.get('/categories', listCategories);
router.get('/:slug',      getApp);
router.get('/',           listApps);

export default router;
