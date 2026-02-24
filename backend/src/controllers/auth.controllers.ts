import {Request,Response} from "express";
import bcrypt from "bcrypt";
import prisma from "../utils/prisma";

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

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET as string,
      { expiresIn: "15m" }
    );

    return res.json({
      message: "Login successful",
      accessToken: token,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};