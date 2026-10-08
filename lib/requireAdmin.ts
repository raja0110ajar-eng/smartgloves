import { getAuth } from "firebase-admin/auth";
import { adminApp } from "./firebaseAdmin";

export async function requireAdmin(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  try {
    const decoded = await getAuth(adminApp).verifyIdToken(token);
    return decoded.admin === true ? decoded : null;
  } catch {
    return null;
  }
}