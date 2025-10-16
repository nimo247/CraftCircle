import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const [error, setError] = useState<string | null>(null);
  const [showSignInLink, setShowSignInLink] = useState(false);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowSignInLink(false);

    if (!email || !password) return setError("Please provide email and password");
    setLoading(true);
    try {
      const { createUserEmailNoAutoSign } = await import("@/firebase");
      const res = await createUserEmailNoAutoSign(email, password);
      setCreated(true);
      setMessage(
        `Account created for ${res.email}. A verification email was sent. Please verify your email, then use the "Complete sign-in" form below to finish.`,
      );
    } catch (err: any) {
      console.error(err);
      const rawMsg = String(err?.message || err?.toString() || "Signup failed");

      // If email already exists, attempt to sign in with provided credentials
      if (rawMsg.includes("EMAIL_EXISTS") || rawMsg.includes("email-already-in-use")) {
        try {
          setError(null);
          // Attempt sign-in using the same credentials
          const { signInEmail } = await import("@/firebase");
          const { user, token } = await signInEmail(email, password);
          // If signIn succeeded, verify with server and navigate
          try {
            const res = await fetch("/api/auth/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ idToken: token }),
            });
            if (!res.ok) {
              console.error("Server verification failed");
              setError("Signed in but server verification failed");
            } else {
              navigate("/");
              return;
            }
          } catch (serverErr) {
            console.error(serverErr);
            setError("Signed in but server verification failed");
          }
        } catch (signErr: any) {
          const signMsg = String(signErr?.message || signErr?.toString() || "");
          // If sign-in failed because email not verified, show friendly message and allow resend
          if (signMsg.toLowerCase().includes("verify") || signMsg.toLowerCase().includes("not verified") || signMsg.toLowerCase().includes("email-not-verified")) {
            setError("Your email is registered but not verified. Please verify your email or resend verification.");
          } else if (signMsg.includes("wrong-password") || signMsg.toLowerCase().includes("password")) {
            setError("An account with that email exists. The password you entered does not match. Please sign in instead.");
            setShowSignInLink(true);
          } else {
            setError("An account with that email already exists. Try signing in instead.");
            setShowSignInLink(true);
          }
        }
      } else if (rawMsg.includes("network-request-failed") || rawMsg.includes("NETWORK") || rawMsg.includes("network")) {
        setError(
          "Network error: failed to reach Firebase. Try opening the app in a new tab or check your network/authorized domains.",
        );
      } else {
        setError(rawMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const onComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return alert("Please provide email and password");
    setLoading(true);
    try {
      const { signInEmail } = await import("@/firebase");
      await signInEmail(email, password);
      // server verify
      const token = await (await import("@/firebase")).auth.currentUser?.getIdToken();
      if (token) {
        const res = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: token }),
        });
        if (!res.ok) throw new Error("Server verification failed");
      }
      alert("Email verified and signed in");
      navigate("/");
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Sign-in failed. Ensure you have verified your email.");
    } finally {
      setLoading(false);
    }
  };

  const resendVerificationClick = async () => {
    if (!email || !password) return setError("Enter the same email and password used during signup to resend verification.");
    setLoading(true);
    try {
      const { resendVerification } = await import("@/firebase");
      await resendVerification(email, password);
      setMessage("Verification email resent. Check your inbox (and spam).");
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to resend verification");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center py-20">
      <div className="container">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="inter-medium font-medium">SignUp</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onCreate} className="grid gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-2"
                    placeholder="you@domain.com"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-2"
                    placeholder="••••••••"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Processing..." : "Create account"}
                </Button>
              </form>

              {created && (
                <div className="mt-6">
                  <div className="p-4 bg-muted rounded">
                    <div className="text-sm">{message}</div>
                  </div>

                  <div className="mt-4">
                    <div className="text-sm text-muted-foreground mb-2">
                      Complete sign-in after verification
                    </div>
                    <form onSubmit={onComplete} className="grid gap-3">
                      <Input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <Button type="submit" disabled={loading}>
                        {loading ? "Processing..." : "Complete sign-in"}
                      </Button>
                    </form>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 p-4 rounded bg-red-50 border border-red-100">
                  <div className="text-sm text-red-800">{error}</div>
                  {showSignInLink && (
                    <div className="mt-2 text-sm">
                      <a href="/auth" className="text-primary underline">
                        Sign in
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Resend verification button */}
              <div className="mt-3">
                <button
                  type="button"
                  onClick={resendVerificationClick}
                  className="text-sm text-primary underline"
                >
                  Resend verification email
                </button>
              </div>

              <div className="mt-4 text-sm text-muted-foreground">
                No account? <a href="/auth" className="text-primary underline">Sign in</a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
