import { getAuth, type DecodedIdToken } from "firebase-admin/auth";
import { FieldValue } from "firebase-admin/firestore";
import { adminApp, adminDb } from "./firebaseAdmin";

// Permintaan ke path ini tidak dicatat (hanya menyusun usulan, tidak mengubah apa pun)
const TIDAK_DICATAT = ["/api/admin/ai/usul"];

async function catat(admin: DecodedIdToken, req: Request) {
  try {
    const path = new URL(req.url).pathname;
    if (TIDAK_DICATAT.includes(path)) return;
    await adminDb.collection("log_admin").add({
      uid: admin.uid,
      email: admin.email ?? "",
      method: req.method,
      path,
      waktu: FieldValue.serverTimestamp(),
    });
  } catch {
    /* pencatatan tidak boleh membuat permintaan gagal */
  }
}

export async function requireAdmin(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  try {
    const decoded = await getAuth(adminApp).verifyIdToken(token);
    if (decoded.admin !== true) return null;
    if (req.method !== "GET") await catat(decoded, req);
    return decoded;
  } catch {
    return null;
  }
}