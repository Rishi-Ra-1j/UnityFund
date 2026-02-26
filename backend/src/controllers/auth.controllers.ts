import {Request,Response} from "express";
import bcrypt from "bcrypt";
import prisma from "../utils/prisma";
import { generateAccessToken, generateRefreshToken, hashToken, getRefreshTokenExpiry } from "../utils/token";
import cookieParser from "cookie-parser";

export const register = async(req: Request,res: Response) =>{
    try{
        const {name,email,password} =req.body;
        if(!name || !email || !password){
            return res.status(400).json({msg:"All fields are required"});
        }
        const existingUser=await prisma.user.findUnique({
            where: {email},
        });
        if(existingUser){
            return res.status(400).json({msg: "user Already exists"});
        }
        const hashedPassword = await bcrypt.hash(password,10);

        const result=await prisma.$transaction(async (tx) =>{
            const user=await tx.user.create({
                data:{
                    name,email,passwordHash: hashedPassword,
                }
            })
            await tx.wallet.create({
                data:{
                    userId: user.id,
                },
            })
            return user;
        });

        return res.status(201).json({
            msg:"user created successfully",
            userId:result.id,
        });
    }
    catch(error){
        console.error(error);
        return res.status(500).json({message:"Internal server error"});
    }
}
import jwt from "jsonwebtoken";

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate tokens
const accessToken = generateAccessToken(user.id);
const refreshToken = generateRefreshToken();
const hashedRefreshToken = hashToken(refreshToken);

// Save refresh token in DB
await prisma.refreshToken.create({
  data: {
    userId: user.id,
    tokenHash: hashedRefreshToken,
    expiresAt: getRefreshTokenExpiry(),
    userAgent: req.headers["user-agent"] as string,
    ipAddress: req.ip,
  },
});

// Send refresh token as httpOnly cookie
res.cookie("refreshToken", refreshToken, {
  httpOnly: true,
  secure: false, // change to true in production
  sameSite: "strict",
  maxAge: 7*24*60*60*1000,
});

return res.json({
  message: "Login successful",
  accessToken,
});
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
export const refresh = async (req: Request, res: Response) => {
  try {
    const token = req.cookies.refreshToken;

    if (!token) {
      return res.status(401).json({ message: "No refresh token" });
    }

    const hashedToken = hashToken(token);

    const existingToken = await prisma.refreshToken.findFirst({
      where: {
        tokenHash: hashedToken,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!existingToken) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    // 🔥 ROTATION STARTS HERE

    // Revoke old token
    await prisma.refreshToken.update({
      where: { id: existingToken.id },
      data: { revoked: true },
    });

    // Generate new refresh token
    const newRefreshToken = generateRefreshToken();
    const newHashedToken = hashToken(newRefreshToken);

    const newTokenRecord = await prisma.refreshToken.create({
      data: {
        userId: existingToken.userId,
        tokenHash: newHashedToken,
        expiresAt: getRefreshTokenExpiry(),
        userAgent: req.headers["user-agent"] as string,
        ipAddress: req.ip,
      },
    });

    // Optional: link replacedBy
    await prisma.refreshToken.update({
      where: { id: existingToken.id },
      data: { replacedBy: newTokenRecord.id },
    });

    const newAccessToken = generateAccessToken(existingToken.userId);

    // Set new cookie
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({ accessToken: newAccessToken });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
export const logout = async (req: Request, res: Response) => {
  try {
    const token = req.cookies.refreshToken;

    if (!token) {
      return res.sendStatus(204);
    }

    const hashedToken = hashToken(token);

    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashedToken },
      data: { revoked: true },
    });

    res.clearCookie("refreshToken");

    return res.json({ message: "Logged out successfully" });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};