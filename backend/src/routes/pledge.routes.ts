import { Router } from "express";
import { createPledge } from "../controllers/pledge.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.post("/", authenticate, createPledge);

export default router;