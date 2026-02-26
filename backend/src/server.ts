import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import cookieParser from "cookie-parser";
import pledgeRoutes from "./routes/pledge.routes";
import cron from "node-cron";
import {processCampaignExpiry} from "./services/campaign.service"; 
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use("/api/auth",authRoutes);
app.use("/api/pledges",pledgeRoutes);
app.get("/",(req,res)=>{
    res.send("GlobalFund API running ");
})
cron.schedule("* * * * *",async()=>{
    console.log("Checking Campaign Expiry...");
    await processCampaignExpiry();
})
app.use("/api/user",userRoutes);

const PORT=process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
});