import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});

const email = process.argv[2];
if (!email) {
  console.error("Masukkan email admin!");
  process.exit(1);
}

try {
  const user = await getAuth().getUserByEmail(email);
  await getAuth().setCustomUserClaims(user.uid, { admin: true });
  console.log("Berhasil, admin:", email);
} catch (error) {
  console.error("Gagal menetapkan admin:", error.message);
}
