import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

type Vendor = {
  id: number;
  business_name?: string;
  contact_email?: string;
  primary_category?: string;
  location?: string;
  status?: string;
  verification_document_url?: string | null;
};

export default function Admin() {
  const navigate = useNavigate();
  const isAdmin =
    typeof window !== "undefined" && localStorage.getItem("isAdmin") === "true";

  const [vendors, setVendors] = useState<Vendor[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let mounted = true;
    async function fetchVendors() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/vendors");
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.message || "Failed to fetch vendors");
        }
        const data = await res.json();
        if (mounted) setVendors(data.vendors || []);
      } catch (err: any) {
        console.error(err);
        if (mounted) setError(err.message || "Unknown error");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchVendors();
    return () => {
      mounted = false;
    };
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="container py-20">
        <Card>
          <CardHeader>
            <CardTitle>Admin access required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">You must sign in as admin to view this page.</p>
            <Button onClick={() => navigate("/auth?role=admin")}>
              Sign in as admin
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-20">
      <Card className="relative">
        {/* Absolute sign out in top-right */}
        <div className="absolute right-4 top-4">
          <Button
            variant="ghost"
            onClick={() => {
              localStorage.removeItem("isAdmin");
              try {
                window.dispatchEvent(new Event("roleChange"));
              } catch (_) {}
              navigate("/");
            }}
          >
            Sign out
          </Button>
        </div>

        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle className="inter-semibold">Admin Dashboard</CardTitle>
            <div className="text-sm text-muted-foreground">
              Welcome, admin. Review and manage vendor applications below.
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-md bg-muted/40">
              <div className="text-sm text-muted-foreground">
                Total applications
              </div>
              <div className="text-2xl font-semibold">
                {vendors ? vendors.length : "—"}
              </div>
            </div>
            <div className="p-4 rounded-md bg-muted/40">
              <div className="text-sm text-muted-foreground">Approved</div>
              <div className="text-2xl font-semibold">
                {vendors
                  ? vendors.filter((v) => v.status === "approved").length
                  : "—"}
              </div>
            </div>
            <div className="p-4 rounded-md bg-muted/40">
              <div className="text-sm text-muted-foreground">Pending</div>
              <div className="text-2xl font-semibold">
                {vendors
                  ? vendors.filter((v) => v.status === "pending").length
                  : "—"}
              </div>
            </div>
          </div>

          {loading && <div>Loading vendors...</div>}
          {error && <div className="text-destructive">Error: {error}</div>}

          {vendors && vendors.length === 0 && (
            <div>No vendor applications found.</div>
          )}

          {vendors && vendors.length > 0 && (
            <div className="overflow-x-auto">
              <div className="rounded-md border">
                <table className="w-full table-auto border-collapse">
                  <thead className="bg-muted/20">
                    <tr className="text-left">
                      <th className="p-3">Business</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Location</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Document</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendors.map((v, idx) => (
                      <tr
                        key={v.id}
                        className={`${idx % 2 === 0 ? "bg-background" : "bg-muted/5"} border-t`}
                      >
                        <td className="p-3 align-top">
                          <div className="font-semibold">{v.business_name}</div>
                          <div className="text-sm text-muted-foreground">
                            ID: {String(v.id).slice(0, 8)}
                          </div>
                        </td>
                        <td className="p-3 align-top">
                          <div className="text-sm">{v.contact_email}</div>
                        </td>
                        <td className="p-3 align-top">{v.primary_category}</td>
                        <td className="p-3 align-top">{v.location}</td>
                        <td className="p-3 align-top">
                          {v.status === "approved" ? (
                            <Badge variant="default">Approved</Badge>
                          ) : v.status === "rejected" ? (
                            <Badge variant="destructive">Rejected</Badge>
                          ) : (
                            <Badge variant="outline">Pending</Badge>
                          )}
                        </td>
                        <td className="p-3 align-top">
                          {v.verification_document_url ? (
                            <a
                              href={v.verification_document_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary underline"
                            >
                              View
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="p-3 align-top">
                          <div className="flex gap-2">
                            {v.status !== "approved" && (
                              <Button
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const res = await fetch(
                                      `/api/admin/vendors/${v.id}`,
                                      {
                                        method: "PATCH",
                                        headers: {
                                          "Content-Type": "application/json",
                                        },
                                        body: JSON.stringify({
                                          status: "approved",
                                        }),
                                      },
                                    );
                                    if (!res.ok)
                                      throw new Error("Failed to approve");
                                    const data = await res.json();
                                    setVendors((s) =>
                                      s
                                        ? s.map((x) =>
                                            x.id === v.id ? data.vendor : x,
                                          )
                                        : s,
                                    );
                                  } catch (err) {
                                    console.error(err);
                                    alert("Failed to approve vendor");
                                  }
                                }}
                              >
                                Approve
                              </Button>
                            )}
                            {v.status !== "rejected" && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={async () => {
                                  try {
                                    const res = await fetch(
                                      `/api/admin/vendors/${v.id}`,
                                      {
                                        method: "PATCH",
                                        headers: {
                                          "Content-Type": "application/json",
                                        },
                                        body: JSON.stringify({
                                          status: "rejected",
                                        }),
                                      },
                                    );
                                    if (!res.ok)
                                      throw new Error("Failed to reject");
                                    const data = await res.json();
                                    setVendors((s) =>
                                      s
                                        ? s.map((x) =>
                                            x.id === v.id ? data.vendor : x,
                                          )
                                        : s,
                                    );
                                  } catch (err) {
                                    console.error(err);
                                    alert("Failed to reject vendor");
                                  }
                                }}
                              >
                                Reject
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
