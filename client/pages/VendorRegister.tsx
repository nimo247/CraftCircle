import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, signOutClient } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  CheckCircle2,
  FileText,
  Leaf,
  Building2,
  Clock,
} from "lucide-react";
import { supabase } from "@/supabaseClient";

interface FormData {
  businessName: string;
  email: string;
  category: string;
  story: string;
  sustainability: string[];
  documents: string[];
  location: string;
  password?: string;
  confirmPassword?: string;
}

const SUSTAINABILITY_OPTIONS = [
  "Ethically sourced materials",
  "Recyclable packaging",
  "Carbon-neutral shipping",
  "Local supply chain",
];

export default function VendorRegister() {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [applicationStatus, setApplicationStatus] = useState<
    "idle" | "pending" | "approved" | "rejected"
  >("idle");
  const [data, setData] = useState<FormData>({
    businessName: "",
    email: "",
    category: "",
    story: "",
    sustainability: [],
    documents: [],
    location: "",
  });
  const [fileObjects, setFileObjects] = useState<File[]>([]);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setCurrentUser(u));
    return () => unsub();
  }, []);

  const progress = useMemo(() => (step / 4) * 100, [step]);

  const toggleSustainability = (value: string) => {
    setData((d) => ({
      ...d,
      sustainability: d.sustainability.includes(value)
        ? d.sustainability.filter((v) => v !== value)
        : [...d.sustainability, value],
    }));
  };

  const onSubmit = async () => {
    setSubmitting(true);
    setUploadError(null);

    try {
      // Basic validation for password fields
      if (!data.password || !data.confirmPassword) {
        setUploadError("Please provide and confirm a password.");
        setSubmitting(false);
        return;
      }
      if (data.password.length < 6) {
        setUploadError("Password must be at least 6 characters.");
        setSubmitting(false);
        return;
      }
      if (data.password !== data.confirmPassword) {
        setUploadError("Passwords do not match.");
        setSubmitting(false);
        return;
      }

      if (fileObjects.length === 0) {
        setUploadError("Please attach at least one PDF document.");
        setSubmitting(false);
        return;
      }

      // Create a Firebase account (no-auto-sign) for vendor so they can log in later
      try {
        const { createUserEmailNoAutoSign } = await import("@/firebase");
        const emailToCreate = (data.email || "").trim().toLowerCase();
        // update local state in case user had whitespace/case differences
        setData((d) => ({ ...d, email: emailToCreate }));
        await createUserEmailNoAutoSign(emailToCreate, data.password);
      } catch (err: any) {
        // If account already exists, ask the user to sign in instead
        const code = err?.code || String(err?.message || err);
        console.error("Firebase create account error:", err, "code:", code);
        if (
          String(code).includes("email-already-in-use") ||
          String(code).includes("already")
        ) {
          setUploadError(
            "An account with this email already exists. Please sign in instead.",
          );
          setSubmitting(false);
          return;
        }
        // Other errors: stop
        setUploadError("Failed to create account. " + (err?.message || ""));
        setSubmitting(false);
        return;
      }

      // Proceed to submit vendor application to server
      const form = new FormData();
      form.append("business_name", data.businessName);
      form.append("contact_email", data.email);
      form.append("primary_category", data.category);
      form.append("location", data.location);
      form.append("your_story", data.story);
      form.append(
        "sustainability_practices",
        JSON.stringify(data.sustainability),
      );
      // append first file only for demo
      form.append("document", fileObjects[0]);

      const res = await fetch("/api/vendor/apply", {
        method: "POST",
        body: form,
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUploadError(json?.message || json?.detail || "Upload failed");
        setSubmitting(false);
        return;
      }

      setStep(4);
      setApplicationStatus("pending");
      setSubmitting(false);
    } catch (err) {
      console.error(err);
      setUploadError("An unexpected error occurred");
      setSubmitting(false);
    }
  };

  useEffect(() => {
    // Prefill email from auth and check if an application already exists for this email.
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u?.email) {
        setData((d) => ({ ...d, email: u.email ?? d.email }));
      }
    });

    let mounted = true;
    const checkExisting = async (email?: string) => {
      if (!email) return;
      try {
        const res = await fetch(
          `/api/admin/vendors?email=${encodeURIComponent(email)}`,
        );
        if (!res.ok) return;
        const json = await res.json().catch(() => ({}));
        const vendor = (json.vendors && json.vendors[0]) || null;
        if (!vendor) return;
        if (!mounted) return;
        // Populate fields and jump to confirmation step
        setData((d) => ({
          ...d,
          businessName: vendor.business_name || d.businessName,
          category: vendor.primary_category || d.category,
          location: vendor.location || d.location,
        }));
        setApplicationStatus(
          vendor.status === "approved"
            ? "approved"
            : vendor.status === "rejected"
              ? "rejected"
              : "pending",
        );
        setStep(4);
      } catch (err) {
        console.error("Error checking existing vendor:", err);
      }
    };

    // If email already filled, check immediately
    if (data.email) checkExisting(data.email);

    return () => {
      mounted = false;
      unsub();
    };
  }, [/* run once and when data.email changes */ data.email]);

  useEffect(() => {
    // Poll vendor status when on the confirmation step and an email is provided
    if (step !== 4 || !data.email) return;
    let mounted = true;
    let interval: any = null;

    const checkStatus = async () => {
      try {
        const res = await fetch(
          `/api/admin/vendors?email=${encodeURIComponent(data.email)}`,
        );
        if (!res.ok) return;
        const json = await res.json().catch(() => ({}));
        const vendor = (json.vendors && json.vendors[0]) || null;
        if (!vendor) return;
        if (!mounted) return;
        if (vendor.status === "approved") {
          setApplicationStatus("approved");
          if (interval) clearInterval(interval);
        } else if (vendor.status === "rejected") {
          setApplicationStatus("rejected");
          if (interval) clearInterval(interval);
        } else {
          // still pending
          setApplicationStatus("pending");
        }
      } catch (err) {
        console.error("Error checking vendor status:", err);
      }
    };

    // Immediately check then poll
    checkStatus();
    interval = setInterval(checkStatus, 5000);

    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
    };
  }, [step, data.email]);

  return (
    <div className="container py-10">
      <div className="mb-6">
        <h1 className="text-3xl inter-medium font-medium tracking-tight">
          Become a Verified Vendor
        </h1>
        <p className="text-muted-foreground mt-2">
          Share your craft with the world. Our quick verification protects
          buyers and elevates trusted artisans.
        </p>
      </div>

      <Progress value={progress} className="h-2" />

      {step === 1 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="size-5" /> Business details
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="businessName">Business name</Label>
              <Input
                id="businessName"
                value={data.businessName}
                onChange={(e) =>
                  setData({ ...data, businessName: e.target.value })
                }
                placeholder="E.g. Riverstone Handcrafts"
              />
            </div>
            <div>
              <Label htmlFor="email">Contact email</Label>
              <Input
                id="email"
                type="email"
                value={data.email}
                onChange={(e) => setData({ ...data, email: e.target.value })}
                placeholder="you@brand.com"
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={data.password || ""}
                onChange={(e) => setData({ ...data, password: e.target.value })}
                placeholder="Choose a password (min 6 chars)"
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={data.confirmPassword || ""}
                onChange={(e) =>
                  setData({ ...data, confirmPassword: e.target.value })
                }
                placeholder="Confirm password"
              />
            </div>
            <div>
              <Label>Primary category</Label>
              <Select
                value={data.category}
                onValueChange={(v) => setData({ ...data, category: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="home">Home & Living</SelectItem>
                  <SelectItem value="fashion">Fashion & Accessories</SelectItem>
                  <SelectItem value="art">Art & Collectibles</SelectItem>
                  <SelectItem value="wellness">Wellness</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={data.location}
                onChange={(e) => setData({ ...data, location: e.target.value })}
                placeholder="City, Country"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="story">Your story</Label>
              <Textarea
                id="story"
                value={data.story}
                onChange={(e) => setData({ ...data, story: e.target.value })}
                placeholder="Tell customers about your mission, craft and community impact..."
                rows={5}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-3">
            <Button
              onClick={() => setStep(2)}
              disabled={!data.businessName || !data.email || !data.category}
            >
              Continue
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 2 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Leaf className="size-5" /> Sustainability practices
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {SUSTAINABILITY_OPTIONS.map((opt) => (
              <label key={opt} className="flex items-start gap-3">
                <Checkbox
                  checked={data.sustainability.includes(opt)}
                  onCheckedChange={() => toggleSustainability(opt)}
                />
                <span className="text-sm leading-snug">{opt}</span>
              </label>
            ))}
            <p className="text-xs text-muted-foreground">
              Select all that apply. This will be shown on your profile.
            </p>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="secondary" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button
              onClick={() => setStep(3)}
              disabled={data.sustainability.length === 0}
            >
              Continue
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 3 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="size-5" /> Verification documents (simulation)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div>
                <Label htmlFor="docs">Upload business documents</Label>
                <Input
                  id="docs"
                  type="file"
                  multiple
                  accept=".pdf,application/pdf"
                  onChange={(e) => {
                    const filesList = Array.from(e.target.files ?? []);
                    if (filesList.length === 0) {
                      setData({ ...data, documents: [] });
                      setFileObjects([]);
                      return;
                    }

                    // Validate all selected files are PDFs
                    const invalid = filesList.filter((f) => {
                      const name = f.name || "";
                      const isPdfByType = f.type === "application/pdf";
                      const isPdfByExt = name.toLowerCase().endsWith(".pdf");
                      return !(isPdfByType || isPdfByExt);
                    });

                    if (invalid.length > 0) {
                      // show a user friendly error and do not accept non-pdf files
                      setUploadError(
                        "Only PDF files are allowed. Please select PDF documents.",
                      );
                      // keep previous valid list
                      return;
                    }

                    // Clear any previous error and store file names and objects
                    setUploadError(null);
                    const files = filesList.map((f) => f.name);
                    setData({ ...data, documents: files });
                    setFileObjects(filesList);
                  }}
                />
                {uploadError && (
                  <div className="mt-2 text-sm text-red-700">{uploadError}</div>
                )}
                {data.documents.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {data.documents.map((d) => (
                      <Badge
                        key={d}
                        variant="secondary"
                        className="inline-flex items-center gap-1"
                      >
                        <FileText className="size-3" />
                        {d}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                We simulate verification in this demo. Do not upload real
                personal data.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="secondary" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button onClick={onSubmit} disabled={data.documents.length === 0}>
              {submitting ? "Submitting..." : "Submit for review"}
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 4 && (
        <Card className="mt-6">
          <CardHeader>
            {applicationStatus === "approved" ? (
              <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle2 className="size-5" /> Application approved
              </CardTitle>
            ) : applicationStatus === "rejected" ? (
              <CardTitle className="flex items-center gap-2 text-destructive">
                <FileText className="size-5" /> Application rejected
              </CardTitle>
            ) : (
              <CardTitle className="flex items-center gap-2 abeezee-regular">
                <Clock className="size-5 animate-spin text-primary" />
                Application submitted (Pending approval)
              </CardTitle>
            )}
          </CardHeader>
          <CardContent>
            {applicationStatus === "approved" ? (
              <p className="text-sm text-muted-foreground">
                Congratulations — your vendor application has been approved. You
                can now access your vendor dashboard and start adding products.
              </p>
            ) : applicationStatus === "rejected" ? (
              <p className="text-sm text-muted-foreground">
                We're sorry — your application was rejected. Check your details
                and contact support for more information.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Thanks for joining CraftCircle! Our team will review your
                details. Meanwhile, your application is pending — we'll notify
                you when it's approved.
              </p>
            )}
            <div className="mt-4 grid gap-3 text-sm">
              <div>
                <span className="font-medium">Business:</span>{" "}
                {data.businessName}
              </div>
              <div>
                <span className="font-medium">Email:</span> {data.email}
              </div>
              <div>
                <span className="font-medium">Category:</span> {data.category}
              </div>
              <div>
                <span className="font-medium">Location:</span> {data.location}
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="font-medium">Practices:</span>{" "}
                {data.sustainability.map((s) => (
                  <Badge key={s} variant="outline">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex gap-3">
            <Button onClick={() => navigate("/")}>Back to home</Button>

            {/* Show Sign out if user is signed in, otherwise show Become a Vendor link */}
            {currentUser ? (
              <Button
                variant="destructive"
                onClick={async () => {
                  try {
                    await signOutClient();
                    localStorage.removeItem("isVendor");
                    try {
                      window.dispatchEvent(new Event("roleChange"));
                    } catch (_) {}
                  } catch (err) {
                    console.error("Sign out failed", err);
                  }
                  navigate("/");
                }}
              >
                Sign out
              </Button>
            ) : (
              <Button asChild>
                <a href="/vendor/register">Become a Vendor</a>
              </Button>
            )}

            {applicationStatus === "approved" ? (
              <>
                <Button asChild>
                  <a href="/vendor/dashboard">Go to dashboard</a>
                </Button>
                <Button variant="secondary" asChild>
                  <a href="/products">Add products</a>
                </Button>
              </>
            ) : (
              <Button
                disabled
                className="opacity-80 inline-flex items-center gap-2"
              >
                <Clock className="size-4" />
                Vendor dashboard
              </Button>
            )}
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
