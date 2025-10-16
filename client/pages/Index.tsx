import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  HeartHandshake,
  Leaf,
  ShieldCheck,
  Star,
  Truck,
  Recycle,
  Sparkles,
} from "lucide-react";

import React, { useEffect, useState } from "react";
import Marketplace from "./Marketplace";

export default function Index() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/products?limit=12");
        if (!res.ok) {
          const txt = await res.text().catch(() => null);
          console.error("Failed to load products:", txt);
          throw new Error("Failed to load products");
        }
        let json: any;
        try {
          json = await res.json();
        } catch (e) {
          const txt = await res.text().catch(() => null);
          console.error("Invalid JSON from /api/products:", txt);
          throw new Error("Invalid JSON response from server");
        }
        setProducts(json.products || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  return (
    <div className="">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-accent/10 to-transparent" />
        <div className="container py-14 md:py-24 grid gap-10 md:grid-cols-2 items-center">
          <div>
            <Badge className="mb-3" variant="secondary">
              Social Impact Marketplace
            </Badge>
            <h1 className="text-4xl md:text-5xl font-extrabold abeezee-regular tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))]">
              Shop handcrafted goods that empower communities
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-prose">
              Discover fair trade products from local artisans. Every purchase
              supports sustainable livelihoods and responsible production.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <a href="/products">Shop ethically</a>
              </Button>
              <Button asChild variant="secondary">
                <a href="/vendor/register">Become a vendor</a>
              </Button>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-4 max-w-md">
              <ImpactStat label="Fair-paid artisans" value="2,100+" />
              <ImpactStat label="CO₂ saved" value="18t" />
              <ImpactStat label="Local vendors" value="540+" />
            </div>
          </div>
          <div className="relative">
            <div className="absolute -right-10 -top-10 size-40 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute -left-6 bottom-6 size-40 rounded-full bg-accent/20 blur-3xl" />
            <div className="relative">
              <Marketplace limit={6} />
              <div className="mt-4 text-center">
                <a
                  href="/products"
                  className="inline-block px-4 py-2 rounded bg-primary text-white hover:opacity-90"
                >
                  View all products
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust and values */}
      <section className="border-t bg-muted/30">
        <div className="container py-10 grid gap-6 md:grid-cols-4">
          <Trust
            icon={<ShieldCheck className="size-5" />}
            title="Verified vendors"
            desc="Business checks and community reviews"
          />
          <Trust
            icon={<Leaf className="size-5" />}
            title="Sustainable"
            desc="Eco-friendly materials and packaging"
          />
          <Trust
            icon={<Truck className="size-5" />}
            title="Tracked shipping"
            desc="Transparent order status from cart to door"
          />
          <Trust
            icon={<HeartHandshake className="size-5" />}
            title="Fair trade"
            desc="Ethical pricing, real impact"
          />
        </div>
      </section>

      {/* Categories */}
      <section>
        <div className="container py-14">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Featured categories
              </h2>
              <p className="text-muted-foreground">Curated by our community</p>
            </div>
            <a
              href="/products"
              className="text-sm font-medium hover:text-primary"
            >
              Explore all
            </a>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <Category name="Home & Living" />
            <Category name="Fashion & Accessories" />
            <Category name="Art & Collectibles" />
            <Category name="Wellness" />
          </div>
        </div>
      </section>

      {/* Vendor stories */}
      <section className="border-t">
        <div className="container py-14">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Sparkles className="size-5" /> Stories that inspire
              </h2>
              <p className="text-muted-foreground">
                Meet the artisans behind the products
              </p>
            </div>
            <a
              href="/reviews"
              className="text-sm font-medium hover:text-primary"
            >
              Read more
            </a>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Story
              name="Minal Singh"
              role="Textile artisan"
              text="My cooperative funds girls' education through each scarf we sell."
            />
            <Story
              name="Akhil Rao"
              role="Woodworker"
              text="We replaced plastic with reclaimed wood, reducing landfill waste."
            />
            <Story
              name="Maya & Ishan"
              role="Ceramicists"
              text="Our kiln now runs on solar energy thanks to community support."
            />
          </div>
        </div>
      </section>

      {/* Reviews highlight */}
      <section className="border-t bg-muted/30">
        <div className="container py-14 grid gap-6 md:grid-cols-3 items-center">
          <div className="md:col-span-2">
            <h2 className="text-2xl font-bold tracking-tight">
              Loved by customers
            </h2>
            <p className="text-muted-foreground mt-2 max-w-prose">
              Multi-dimensional reviews ensure quality across product, delivery
              and communication.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Review
                name="Neha"
                rating={5}
                text="Beautiful craftsmanship and great communication."
              />
              <Review
                name="Parth"
                rating={4}
                text="Delivery was quick and the product exceeded expectations."
              />
            </div>
          </div>
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold">Ready to start selling?</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Join hundreds of local makers who turned passion into income.
              </p>
              <Button className="mt-4" asChild>
                <a href="/vendor/register">Apply as vendor</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function ImpactStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-2xl font-extrabold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function Trust({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="size-9 grid place-items-center rounded-lg bg-gradient-to-tr from-[hsl(var(--primary))] to-[hsl(var(--accent))] text-white shadow">
        {icon}
      </div>
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-muted-foreground">{desc}</div>
      </div>
    </div>
  );
}

function Category({ name }: { name: string }) {
  // Use a curated image for Home & Living; otherwise fallback to placeholder
  const curated = {
    "Home & Living":
      "https://cdn.builder.io/api/v1/image/assets%2F7f805101456245d1ad00c14c720d96cd%2F7860a77aaf4b4517aacc41f27681c974?format=webp&width=1200",
    "Fashion & Accessories":
      "https://cdn.builder.io/api/v1/image/assets%2F7f805101456245d1ad00c14c720d96cd%2F132a6deea3504964976d654a2e85a2c0?format=webp&width=1200",
    "Art & Collectibles":
      "https://cdn.builder.io/api/v1/image/assets%2F7f805101456245d1ad00c14c720d96cd%2F3f30f1b92a944432a4f37c07e54c8bc1?format=webp&width=1200",
    Wellness:
      "https://cdn.builder.io/api/v1/image/assets%2F7f805101456245d1ad00c14c720d96cd%2Feea8e38e6a784a44a6a87fa05eeffcc6?format=webp&width=1200",
  } as Record<string, string>;

  const src = curated[name] || "/placeholder.svg?height=400&width=600";

  return (
    <a
      href="/products"
      className="group relative overflow-hidden rounded-lg border bg-card"
    >
      <img
        src={src}
        alt={name}
        className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      <div className="absolute bottom-3 left-3 text-white font-semibold drop-shadow">
        {name}
      </div>
    </a>
  );
}

function Story({
  name,
  role,
  text,
}: {
  name: string;
  role: string;
  text: string;
}) {
  return (
    <Card>
      <CardContent className="p-6 flex items-start gap-4">
        <Avatar>
          <AvatarImage src={`/placeholder.svg?height=80&width=80`} />
          <AvatarFallback>{name.substring(0, 2)}</AvatarFallback>
        </Avatar>
        <div>
          <div className="font-semibold">{name}</div>
          <div className="text-xs text-muted-foreground">{role}</div>
          <p className="mt-2 text-sm">{text}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Review({
  name,
  rating,
  text,
}: {
  name: string;
  rating: number;
  text: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2">
          <div className="font-semibold">{name}</div>
          <div className="flex text-amber-500">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`size-4 ${i < rating ? "fill-current" : "opacity-30"}`}
              />
            ))}
          </div>
        </div>
        <p className="text-sm mt-2">{text}</p>
      </CardContent>
    </Card>
  );
}
