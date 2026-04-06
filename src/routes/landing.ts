import express from 'express';
import { getLandingData } from '../controllers/landing';

const router = express.Router();

router.get('/', getLandingData);

export default router;

