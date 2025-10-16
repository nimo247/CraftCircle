import { Link } from "react-router-dom";
import { Leaf, HeartHandshake, ShieldCheck } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-gradient-to-t from-[hsl(var(--background))] to-[hsl(var(--card))]">
      <div className="container py-12 grid gap-8 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="size-9 grid place-items-center rounded-lg bg-gradient-to-tr from-[hsl(var(--primary))] to-[hsl(var(--accent))] text-white shadow">
              <Leaf className="size-5" />
            </div>
            <span className="font-extrabold tracking-tight">CraftCircle</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            A marketplace empowering local artisans through fair trade and
            sustainable commerce.
          </p>
        </div>
        <div>
          <h4 className="font-semibold">Marketplace</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/products" className="hover:text-primary">
                Products
              </Link>
            </li>
            <li>
              <Link to="/reviews" className="hover:text-primary">
                Reviews
              </Link>
            </li>
            <li>
              <Link to="/vendor/register" className="hover:text-primary">
                Become a Vendor
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold">Impact</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <HeartHandshake className="size-4 text-accent" /> Fair trade
              commitment
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" /> Vendor
              verification
            </li>
            <li className="flex items-center gap-2">
              <Leaf className="size-4 text-green-600" /> Sustainable practices
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t">
        <div className="container py-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} CraftCircle. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
