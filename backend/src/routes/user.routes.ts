import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.get("/me", authenticate, (req: any, res) => {
  res.json({
    message: "Protected route accessed",
    userId: req.userId,
  });
});

export default router;