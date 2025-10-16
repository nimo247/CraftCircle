import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  signOut,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBCNrHqvOaUb8BUYG8cD4jAPk-Y3E5ZonY",
  authDomain: "craftcircle-e3e13.firebaseapp.com",
  projectId: "craftcircle-e3e13",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export async function signInWithGooglePopup() {
  try {
    const result = await signInWithPopup(auth, provider);
    const token = await result.user.getIdToken();
    return { user: result.user, token };
  } catch (err: any) {
    // Normalize common popup/cancel errors so callers can handle gracefully
    const code = err?.code || err?.message || String(err);
    if (
      code &&
      (code.includes("cancelled-popup-request") ||
        code.includes("popup-closed-by-user") ||
        code.includes("popup-blocked"))
    ) {
      // return null to indicate the popup flow was interrupted by the user or browser
      return null as any;
    }
    // rethrow other errors
    throw err;
  }
}

export async function createUserEmail(
  name: string,
  email: string,
  password: string,
) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (name) {
    await updateProfile(cred.user, { displayName: name });
  }
  await sendEmailVerification(cred.user);
  const token = await cred.user.getIdToken();
  return { user: cred.user, token };
}

// Create user but do not keep them signed in — send verification and sign out
export async function createUserEmailNoAutoSign(
  email: string,
  password: string,
) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(cred.user);
  // Sign the user out so they are not authenticated until they verify and sign in
  await signOut(auth);
  return { email: cred.user.email };
}

export async function signInEmail(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  // Block sign-in if email not verified
  if (!cred.user.emailVerified) {
    await signOut(auth);
    throw new Error(
      "Email not verified. Please verify your email before signing in.",
    );
  }
  const token = await cred.user.getIdToken();
  return { user: cred.user, token };
}

// Sign in without enforcing email verification. Intended for vendor flow where admin approval is required separately.
export async function signInEmailNoVerify(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const token = await cred.user.getIdToken();
  return { user: cred.user, token };
}

export async function signOutClient() {
  await signOut(auth);
}

// Resend verification: sign in temporarily, send verification email, then sign out
export async function resendVerification(email: string, password: string) {
  // Sign in without verification check
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(cred.user);
  await signOut(auth);
  return { email: cred.user.email };
}

export { auth };
