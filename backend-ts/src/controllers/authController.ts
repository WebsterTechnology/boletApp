import bcrypt from "bcryptjs";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { currentUser } from "../middleware/authenticate";
import { Katchif, Maryaj, User } from "../models";
import { errorMessage } from "../utils/errors";

/** Shape user payload consistently for responses. */
export function shapeUser(u: User) {
  return {
    id: u.id,
    phone: u.phone,
    points: Number(u.points ?? 0),
    isAdmin: !!u.isAdmin,
    fullName: u.fullName || "",
    cpf: u.cpf || "",
    birthDate: u.birthDate || "",
    email: u.email || "",
    address: u.address || "",
    city: u.city || "",
    state: u.state || "",
    cep: u.cep || "",
    profileComplete: !!(u.fullName && u.email),
  };
}

function signToken(user: User): string {
  return jwt.sign({ id: user.id, phone: user.phone, isAdmin: user.isAdmin }, env.jwtSecret, {
    expiresIn: "1d",
  });
}

export async function login(req: Request, res: Response) {
  const { phone, password } = req.body ?? {};

  if (!phone || !password) {
    return res.status(400).json({ message: "Phone and password are required" });
  }

  try {
    const user = await User.findOne({ where: { phone } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(String(password), user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid password" });

    return res.status(200).json({
      message: "Login successful",
      user: shapeUser(user),
      token: signToken(user),
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function register(req: Request, res: Response) {
  const { phone, password, fullName, email } = req.body ?? {};

  if (!phone || !password || !fullName || !email) {
    return res.status(400).json({ message: "Name, email, phone and password are required" });
  }
  if (String(password).length !== 4) {
    return res.status(400).json({ message: "Password must be exactly 4 digits" });
  }

  try {
    const exists = await User.findOne({ where: { phone } });
    if (exists) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(String(password), 10);
    const user = await User.create({
      phone,
      password: hashedPassword,
      fullName: String(fullName).trim(),
      email: String(email).trim().toLowerCase(),
      isAdmin: false,
      profileOnboardingDone: true,
    });

    return res.status(201).json({ message: "User created", user: shapeUser(user), token: signToken(user) });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/** DELETE USER (admin only). Also removes the user's Maryaj and Katchif bets. */
export async function deleteUser(req: Request, res: Response) {
  try {
    const id = String(req.params.id);

    if (!currentUser(req).isAdmin) {
      return res.status(403).json({ message: "Access denied" });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await Maryaj.destroy({ where: { userId: user.id } });
    await Katchif.destroy({ where: { userId: user.id } });
    await user.destroy();

    return res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Delete user error:", err);
    return res.status(500).json({ message: "Server error", error: errorMessage(err) });
  }
}

export async function completeProfile(req: Request, res: Response) {
  try {
    const user = await User.findByPk(currentUser(req).id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const fullName = String(req.body?.fullName || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!fullName || !email) {
      return res.status(400).json({ message: "Name and email are required" });
    }

    user.fullName = fullName;
    user.email = email;
    user.profileOnboardingDone = true;
    await user.save();

    return res.json({ message: "Account completed", user: shapeUser(user) });
  } catch (err) {
    console.error("Complete profile error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
