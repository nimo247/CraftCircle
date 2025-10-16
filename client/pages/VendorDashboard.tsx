import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";

type Product = {
  id: number | string;
  vendor_email: string;
  title: string;
  description?: string;
  price?: number;
  stock?: number;
  status?: string;
  images?: string[];
  categories?: string[];
  tags?: string[];
  low_stock_threshold?: number | null;
};

export default function VendorDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<Partial<Product>>({
    title: "",
    price: 0,
    stock: 0,
    status: "draft",
    // additional fields
    images: [] as string[] | undefined,
    categories: [] as string[] | undefined,
    tags: [] as string[] | undefined,
    low_stock_threshold: 5,
  } as any);
  const [editingId, setEditingId] = useState<string | number | null>(null);

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [csvUploading, setCsvUploading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchProducts();
  }, [user]);

  useEffect(() => {
    // generate previews
    const urls = imageFiles.map((f) => URL.createObjectURL(f));
    setImagePreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [imageFiles]);

  const fetchProducts = async () => {
    if (!user || !user.email) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/vendor/products?email=${encodeURIComponent(user.email)}`,
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setProducts(json.products || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const uploadImages = async (files: File[]) => {
    if (!files || files.length === 0) return [];
    const formData = new FormData();
    files.forEach((f) => formData.append("images", f));
    // vendor_email optional
    if (user?.email) formData.append("vendor_email", user.email);
    const res = await fetch("/api/vendor/products/upload-image", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Image upload failed");
    const json = await res.json();
    return json.urls || [];
  };

  const handleCreate = async () => {
    if (!user || !user.email) return alert("Please sign in as vendor");
    if (!form.title) return alert("Title required");
    try {
      let uploadedUrls: string[] = [];
      if (imageFiles.length > 0) {
        uploadedUrls = await uploadImages(imageFiles);
      }
      const payload: any = {
        ...form,
        images: uploadedUrls.length > 0 ? uploadedUrls : form.images,
        categories: Array.isArray(form.categories)
          ? form.categories
          : (form.categories || []).filter(Boolean),
        tags: Array.isArray(form.tags)
          ? form.tags
          : (form.tags || []).filter(Boolean),
        vendor_email: user.email,
        // ensure vendor products appear immediately
        status: "active",
      };
      const res = await fetch(`/api/vendor/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Create failed");
      const json = await res.json();
      setProducts((p) => [json.product, ...p]);
      setForm({
        title: "",
        price: 0,
        stock: 0,
        status: "draft",
        images: [],
        categories: [],
        tags: [],
        low_stock_threshold: 5,
      });
      setImageFiles([]);
      setImagePreviews([]);
    } catch (err) {
      console.error(err);
      alert("Failed to create product");
    }
  };

  const handleSave = async (id: string | number) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;
    try {
      const res = await fetch(`/api/vendor/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product),
      });
      if (!res.ok) throw new Error("Update failed");
      const json = await res.json();
      setProducts((p) => p.map((x) => (x.id === id ? json.product : x)));
      setEditingId(null);
    } catch (err) {
      console.error(err);
      alert("Failed to update product");
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!confirm("Delete this product?")) return;
    try {
      const res = await fetch(`/api/vendor/products/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      setProducts((p) => p.filter((x) => x.id !== id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete product");
    }
  };

  if (!user) {
    return (
      <div className="container py-20">
        <Card>
          <CardHeader>
            <CardTitle>Vendor dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Please sign in as an approved vendor to manage products.</p>
            <div className="mt-4">
              <Button asChild>
                <a href="/auth?role=vendor">Sign in as vendor</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-20">
      <Card>
        <CardHeader>
          <CardTitle>Vendor Dashboard</CardTitle>
          <div className="text-sm text-muted-foreground">
            Manage your products
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Title</Label>
              <Input
                value={form.title || ""}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <Label>Price (USD)</Label>
              <Input
                type="number"
                value={String(form.price ?? 0)}
                onChange={(e) =>
                  setForm({ ...form, price: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <Label>Stock</Label>
              <Input
                type="number"
                value={String(form.stock ?? 0)}
                onChange={(e) =>
                  setForm({ ...form, stock: Number(e.target.value) })
                }
              />
            </div>

            <div>
              <Label>Low stock threshold</Label>
              <Input
                type="number"
                value={String(form.low_stock_threshold ?? 5)}
                onChange={(e) =>
                  setForm({
                    ...form,
                    low_stock_threshold: Number(e.target.value),
                  })
                }
              />
            </div>

            <div>
              <Label>Categories (comma separated)</Label>
              <Input
                value={(form.categories || []).join(", ")}
                onChange={(e) =>
                  setForm({
                    ...form,
                    categories: String(e.target.value)
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
            </div>

            <div>
              <Label>Tags (comma separated)</Label>
              <Input
                value={(form.tags || []).join(", ")}
                onChange={(e) =>
                  setForm({
                    ...form,
                    tags: String(e.target.value)
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
            </div>

            <div className="md:col-span-3">
              <Label>Images</Label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) =>
                  setImageFiles(Array.from(e.target.files || []))
                }
              />
              <div className="mt-2 flex gap-2">
                {imagePreviews.map((u, i) => (
                  <img
                    key={i}
                    src={u}
                    alt={`preview-${i}`}
                    className="w-20 h-20 object-cover rounded"
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2 mb-6 items-center">
            <Button onClick={handleCreate}>Add product</Button>
            <Button variant="ghost" onClick={() => navigate("/")}>
              Back to site
            </Button>

            <div className="ml-4">
              <Label>Bulk CSV upload</Label>
              <input
                type="file"
                accept=".csv"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setCsvUploading(true);
                  try {
                    const text = await f.text();
                    const lines = text
                      .split(/\r?\n/)
                      .map((l) => l.trim())
                      .filter(Boolean);
                    const headers = lines[0]
                      .split(",")
                      .map((h) => h.trim().toLowerCase());
                    const rows = lines.slice(1).map((line) => {
                      const cols = line.split(",");
                      const obj: any = {};
                      headers.forEach((h, idx) => {
                        obj[h] = cols[idx] ? cols[idx].trim() : "";
                      });
                      return obj;
                    });
                    // Map rows to expected product shape
                    const payload = rows.map((r) => ({
                      title: r.title || r.name,
                      description: r.description || "",
                      price: Number(r.price || 0),
                      stock: Number(r.stock || 0),
                      status: r.status || "active",
                      categories: r.categories
                        ? r.categories
                            .split(";")
                            .map((s: string) => s.trim())
                            .filter(Boolean)
                        : [],
                      tags: r.tags
                        ? r.tags
                            .split(";")
                            .map((s: string) => s.trim())
                            .filter(Boolean)
                        : [],
                      low_stock_threshold: r.low_stock_threshold
                        ? Number(r.low_stock_threshold)
                        : null,
                    }));

                    const res = await fetch("/api/vendor/products/bulk", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        vendor_email: user.email,
                        products: payload,
                      }),
                    });
                    if (!res.ok) throw new Error("Bulk upload failed");
                    const json = await res.json();
                    setProducts((p) => [...json.products, ...p]);
                    alert("Bulk upload successful");
                  } catch (err) {
                    console.error(err);
                    alert("Bulk upload failed");
                  } finally {
                    setCsvUploading(false);
                  }
                }}
              />
            </div>
          </div>

          {/* Low stock alerts */}
          <div className="mb-4">
            {products.filter(
              (p) =>
                p.low_stock_threshold != null &&
                (p.stock ?? 0) <= (p.low_stock_threshold ?? 0),
            ).length > 0 && (
              <div className="p-3 rounded bg-destructive/10 text-destructive">
                Low stock alerts:{" "}
                {
                  products.filter(
                    (p) =>
                      p.low_stock_threshold != null &&
                      (p.stock ?? 0) <= (p.low_stock_threshold ?? 0),
                  ).length
                }{" "}
                products are low in stock.
              </div>
            )}
          </div>

          {loading && <div>Loading...</div>}

          <div className="space-y-3">
            {products.map((p) => (
              <div
                key={p.id}
                className="p-4 rounded border flex items-start justify-between gap-4"
              >
                <div className="flex-1">
                  {editingId === p.id ? (
                    <div className="space-y-2">
                      <Input
                        value={p.title}
                        onChange={(e) =>
                          setProducts((s) =>
                            s.map((x) =>
                              x.id === p.id
                                ? { ...x, title: e.target.value }
                                : x,
                            ),
                          )
                        }
                      />
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={String(p.stock ?? 0)}
                          onChange={(e) =>
                            setProducts((s) =>
                              s.map((x) =>
                                x.id === p.id
                                  ? { ...x, stock: Number(e.target.value) }
                                  : x,
                              ),
                            )
                          }
                        />
                        <Input
                          type="number"
                          value={String(p.low_stock_threshold ?? 5)}
                          onChange={(e) =>
                            setProducts((s) =>
                              s.map((x) =>
                                x.id === p.id
                                  ? {
                                      ...x,
                                      low_stock_threshold: Number(
                                        e.target.value,
                                      ),
                                    }
                                  : x,
                              ),
                            )
                          }
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="font-semibold">{p.title}</div>
                  )}
                  <div className="text-sm text-muted-foreground">
                    Price: ₹{p.price} • Stock: {p.stock}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {Array.isArray(p.categories)
                      ? (p.categories as any).join(", ")
                      : ""}
                  </div>
                  <div className="flex gap-2 mt-2">
                    {Array.isArray(p.images)
                      ? (p.images as any)
                          .slice(0, 3)
                          .map((u: string, i: number) => (
                            <img
                              key={i}
                              src={u}
                              className="w-16 h-16 object-contain rounded"
                            />
                          ))
                      : null}
                  </div>

                  {/* Low stock badge */}
                  {p.low_stock_threshold != null &&
                    (p.stock ?? 0) <= (p.low_stock_threshold ?? 5) && (
                      <div className="mt-2 inline-block px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs">
                        Low stock: {p.stock}
                      </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                  <div>
                    {p.status === "active" ? (
                      <Badge>Active</Badge>
                    ) : p.status === "draft" ? (
                      <Badge variant="outline">Draft</Badge>
                    ) : (
                      <Badge variant="destructive">Out</Badge>
                    )}
                  </div>
                  {editingId === p.id ? (
                    <>
                      <Button size="sm" onClick={() => handleSave(p.id)}>
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" onClick={() => setEditingId(p.id)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(p.id)}
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Local UI components for labels
function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-muted-foreground mb-1">{children}</div>;
}
