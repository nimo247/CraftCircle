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
import { Separator } from "@/components/ui/separator";
import { Globe, Facebook } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { signInWithGooglePopup } from "@/firebase";

export default function Auth() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const initialRole =
    (params.get("role") as "customer" | "vendor" | "admin") || "customer";

  const [role, setRole] = useState<"customer" | "vendor" | "admin">(
    initialRole,
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [username, setUsername] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showResend, setShowResend] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(location.search).get("role") as
      | "customer"
      | "vendor"
      | "admin"
      | null;
    if (p) setRole(p);
  }, [location.search]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));

    if (role === "customer") {
      // If name provided, treat as signup; otherwise treat as login
      if (name) {
        if (!name || !email || !password || !confirm) {
          setLoading(false);
          return alert("Please fill all fields");
        }
        if (password !== confirm) {
          setLoading(false);
          return alert("Passwords do not match");
        }

        try {
          const { createUserEmailNoAutoSign } = await import("@/firebase");
          const { email: createdEmail } = await createUserEmailNoAutoSign(
            email,
            password,
          );
          setLoading(false);
          alert(
            `Account created for ${createdEmail}. A verification email was sent. Please check your inbox and verify before signing in.`,
          );
          navigate("/");
          return;
        } catch (err: any) {
          console.error(err);
          setLoading(false);
          return alert(err?.message || "Signup failed");
        }
      } else {
        // Login flow
        if (!email || !password) {
          setLoading(false);
          return alert("Please enter email and password");
        }
        try {
          const { signInEmail } = await import("@/firebase");
          const { user, token } = await signInEmail(email, password);

          // Verify with server
          const res = await fetch("/api/auth/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken: token }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => null);
            console.error("Server verification failed", err);
            setLoading(false);
            setAuthError("Server verification failed");
            return;
          }
          const data = await res.json();
          console.log("Verified user:", data);
          setLoading(false);
          navigate("/");
          return;
        } catch (err: any) {
          console.error(err);
          setLoading(false);
          const msg = String(err?.message || err?.toString() || "Login failed");
          if (
            msg.toLowerCase().includes("verify") ||
            msg.toLowerCase().includes("not verified") ||
            msg.toLowerCase().includes("email-not-verified")
          ) {
            setAuthError(
              "Email not verified. Please verify your email before signing in.",
            );
            setShowResend(true);
          } else {
            setAuthError(msg);
            setShowResend(false);
          }
          return;
        }
      }
    }

    if (role === "vendor") {
      if (!email || !password) {
        setLoading(false);
        return alert("Please provide email and password");
      }

      try {
        const { signInEmailNoVerify, signOutClient } = await import(
          "@/firebase"
        );
        const { user, token } = await signInEmailNoVerify(email, password);

        // Check vendor approval status on server
        const res = await fetch("/api/admin/vendors/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.message || "Failed to verify vendor status");
        }
        const data = await res.json();
        const vendor = data.vendor;
        if (!vendor) {
          // No application found
          await signOutClient();
          setLoading(false);
          setAuthError("No vendor application found for this email.");
          return;
        }
        if (vendor.status !== "approved") {
          await signOutClient();
          setLoading(false);
          setAuthError("Your vendor application is not approved yet.");
          return;
        }

        // Approved vendor — allow login and mark vendor flag
        sessionStorage.setItem("isVendor", "true");
        // notify other parts of the app in this window
        try {
          window.dispatchEvent(new Event("roleChange"));
        } catch (_) {}
        setLoading(false);
        navigate("/vendor/dashboard");
        return;
      } catch (err: any) {
        console.error(err);
        setLoading(false);
        setAuthError(String(err?.message || "Vendor login failed"));
        return;
      }
    }

    if (role === "admin") {
      if (!username || !adminKey) {
        setLoading(false);
        return alert("Please provide username and admin key");
      }

      // Validate credentials
      const ADMIN_USERNAME = "nimo247";
      const ADMIN_KEY = "NLRM1103";

      if (username === ADMIN_USERNAME && adminKey === ADMIN_KEY) {
        // Mark as admin in local storage and navigate to admin dashboard
        sessionStorage.setItem("isAdmin", "true");
        // persist the admin key so client can call admin endpoints
        try {
          sessionStorage.setItem("adminKey", adminKey);
        } catch (_) {}
        // notify other parts of the app in this window
        try {
          window.dispatchEvent(new Event("roleChange"));
        } catch (_) {}
        setLoading(false);
        alert("Admin signed in");
        navigate("/admin");
        return;
      } else {
        setLoading(false);
        setAuthError("Invalid admin credentials");
        return;
      }
    }

    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    if (loading) return; // prevent double clicks
    setLoading(true);
    try {
      const result = await signInWithGooglePopup();
      if (!result) {
        // Popup was cancelled or blocked — don't show an error to the user
        setLoading(false);
        return;
      }

      const { token, user } = result as { token: string; user: any };
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: token }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        console.error("Server verification failed", err);
        alert("Server verification failed");
        setLoading(false);
        return;
      }

      const data = await res.json();
      console.log("Verified user:", data);
      alert(`Signed in as ${user.displayName ?? user.email}`);
      navigate("/");
    } catch (err: any) {
      console.error(err);
      // Ignore cancelled-popup-request which sometimes surfaces here
      const msg = String(err?.code || err?.message || err);
      if (
        msg.includes("cancelled-popup-request") ||
        msg.includes("popup-closed-by-user") ||
        msg.includes("popup-blocked")
      ) {
        // no-op
      } else {
        alert("Google sign-in failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center py-20 bg-gradient-to-b from-[hsl(var(--background))] to-[hsl(var(--card))]">
      <div className="container">
        <div className="max-w-3xl mx-auto">
          <div className="relative">
            <div className="absolute -left-12 -top-8 w-40 h-40 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
            <div className="absolute -right-12 -bottom-8 w-40 h-40 rounded-full bg-accent/20 blur-3xl pointer-events-none" />
            <Card className="overflow-hidden rounded-2xl shadow-xl">
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="hidden md:flex flex-col justify-center gap-6 p-8 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] text-white">
                  <h3 className="text-2xl inter-medium">Welcome back</h3>
                  <p className="text-sm opacity-90">
                    Sign in to manage orders, shop, and support local artisans.
                    Your account keeps track of purchases, favorites and vendor
                    interactions.
                  </p>
                  <div className="mt-2">
                    <div className="text-xs uppercase opacity-80">
                      Why CraftCircle?
                    </div>
                    <ul className="mt-2 space-y-2 text-sm">
                      <li>• Fair trade & transparent fees</li>
                      <li>• Support local artisans</li>
                      <li>• Sustainable & ethical products</li>
                    </ul>
                  </div>
                </div>

                <div className="p-8 bg-card">
                  <CardHeader className="p-0">
                    <CardTitle className="text-2xl inter-medium">
                      Sign in to{" "}
                      <span className="bg-clip-text text-transparent bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))]">
                        CraftCircle
                      </span>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Access your orders, vendor dashboard, and more.
                    </p>
                  </CardHeader>

                  <CardContent className="p-0 mt-6">
                    <form onSubmit={onSubmit} className="grid gap-4 mt-4">
                      {role === "customer" && (
                        <div>
                          <Label htmlFor="name">Name</Label>
                          <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your full name"
                            className="mt-2"
                          />
                        </div>
                      )}

                      {(role === "customer" || role === "vendor") && (
                        <>
                          <div>
                            <Label htmlFor="email">Email</Label>
                            <Input
                              id="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder=""
                              className="mt-2"
                            />
                          </div>
                          <div>
                            <Label htmlFor="password">Password</Label>
                            <Input
                              id="password"
                              type="password"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="••••••••"
                              className="mt-2"
                            />
                          </div>
                        </>
                      )}

                      {role === "customer" && (
                        <div>
                          <Label htmlFor="confirm">Confirm password</Label>
                          <Input
                            id="confirm"
                            type="password"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            placeholder="••••••••"
                            className="mt-2"
                          />
                        </div>
                      )}

                      {role === "admin" && (
                        <>
                          <div>
                            <Label htmlFor="username">Username</Label>
                            <Input
                              id="username"
                              type="password"
                              value={username}
                              onChange={(e) => setUsername(e.target.value)}
                              placeholder="admin username"
                              className="mt-2"
                              autoComplete="username"
                            />
                          </div>
                          <div>
                            <Label htmlFor="adminkey">Admin key</Label>
                            <Input
                              id="adminkey"
                              type="password"
                              value={adminKey}
                              onChange={(e) => setAdminKey(e.target.value)}
                              placeholder="secret admin key"
                              className="mt-2"
                              autoComplete="current-password"
                            />
                          </div>
                        </>
                      )}

                      <Button
                        type="submit"
                        className="mt-2 w-full"
                        disabled={loading}
                      >
                        {loading
                          ? "Processing..."
                          : role === "customer"
                            ? "Create account"
                            : role === "vendor"
                              ? "Continue"
                              : "Request admin access"}
                      </Button>
                    </form>

                    {authError && (
                      <div className="mt-4 p-4 rounded bg-red-50 border border-red-100">
                        <div className="text-sm text-red-800">{authError}</div>
                        {showResend && (
                          <div className="mt-2">
                            <button
                              type="button"
                              onClick={async () => {
                                setLoading(true);
                                try {
                                  const { resendVerification } = await import(
                                    "@/firebase"
                                  );
                                  await resendVerification(email, password);
                                  setAuthError(
                                    "Verification email resent. Check your inbox.",
                                  );
                                  setShowResend(false);
                                } catch (err: any) {
                                  console.error(err);
                                  setAuthError(
                                    err?.message ||
                                      "Failed to resend verification",
                                  );
                                } finally {
                                  setLoading(false);
                                }
                              }}
                              className="text-sm text-primary underline"
                            >
                              Resend verification email
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {role === "customer" && (
                      <>
                        <div className="my-6 flex items-center gap-4 w-full">
                          <div className="flex-1">
                            <Separator />
                          </div>
                          <div className="text-xs text-muted-foreground whitespace-nowrap">
                            Or continue with
                          </div>
                          <div className="flex-1">
                            <Separator />
                          </div>
                        </div>

                        <div className="flex flex-col gap-3">
                          <Button
                            variant="outline"
                            className="w-full inline-flex items-center justify-center gap-3 py-3 text-sm font-medium text-foreground"
                            onClick={handleGoogleSignIn}
                          >
                            <Globe />
                            <span>Continue with Google</span>
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full inline-flex items-center justify-center gap-3 py-3 text-sm font-medium text-foreground"
                            onClick={() => alert("Simulated Facebook login")}
                          >
                            <Facebook />
                            <span>Continue with Facebook</span>
                          </Button>
                        </div>
                      </>
                    )}

                    {role !== "admin" && (
                      <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
                        <div>
                          Forgot password?{" "}
                          <a
                            href="/auth/reset"
                            className="text-primary underline"
                          >
                            Reset
                          </a>
                        </div>
                        {role === "customer" ? (
                          <div>
                            Already have account?{" "}
                            <a
                              href="/signup"
                              className="text-primary underline"
                            >
                              Sign Up
                            </a>
                          </div>
                        ) : (
                          <div>
                            No account?{" "}
                            <a
                              href="/vendor/register"
                              className="text-primary underline"
                            >
                              Become a vendor
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
