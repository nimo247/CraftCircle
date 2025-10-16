import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  ShoppingBag,
  Store,
  Menu,
  Leaf,
  Search,
  User,
  BarChart2,
  Heart,
} from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, signOutClient } from "@/firebase";

function useCartCount() {
  const [count, setCount] = useState<number>(0);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("cart");
      const arr = raw ? (JSON.parse(raw) as unknown[]) : [];
      setCount(Array.isArray(arr) ? arr.length : 0);
    } catch {
      setCount(0);
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === "cart") {
        try {
          const arr = e.newValue ? (JSON.parse(e.newValue) as unknown[]) : [];
          setCount(Array.isArray(arr) ? arr.length : 0);
        } catch {
          setCount(0);
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return count;
}

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const cartCount = useCartCount();
  const [q, setQ] = useState("");
  const [user, setUser] = useState<any | null>(null);
  // derive isAdmin and isVendor from localStorage and keep them in state so header updates when flags change
  const [isAdmin, setIsAdmin] = useState(
    typeof window !== "undefined" && sessionStorage.getItem("isAdmin") === "true",
  );
  const [isVendor, setIsVendor] = useState(
    typeof window !== "undefined" &&
      sessionStorage.getItem("isVendor") === "true",
  );

  useEffect(() => {
    const onRoleChange = () => {
      setIsAdmin(
        typeof window !== "undefined" &&
          sessionStorage.getItem("isAdmin") === "true",
      );
      setIsVendor(
        typeof window !== "undefined" &&
          sessionStorage.getItem("isVendor") === "true",
      );
    };

    window.addEventListener("roleChange", onRoleChange as EventListener);
    return () => {
      window.removeEventListener("roleChange", onRoleChange as EventListener);
    };
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setQ(params.get("q") ?? "");
  }, [location.search]);

  const NavLinks = useMemo(
    () => (
      <div className="hidden md:flex items-center">
        <div className="hidden md:flex items-center bg-primary/10 dark:bg-primary/20 rounded-full p-1 gap-1 shadow-sm border border-input">
          <RouterLink
            to="/products"
            className="px-3 py-2 text-sm rounded-full hover:bg-primary/20 text-black dark:text-white"
          >
            Products
          </RouterLink>
          <RouterLink
            to="/vendor/register"
            className="px-3 py-2 text-sm rounded-full hover:bg-primary/20 text-black dark:text-white"
          >
            Become a Vendor
          </RouterLink>
          <RouterLink
            to="/reviews"
            className="px-3 py-2 text-sm rounded-full hover:bg-primary/20 text-black dark:text-white"
          >
            Reviews
          </RouterLink>
          {!(user || isVendor || isAdmin) ? (
            <Popover>
              <PopoverTrigger asChild>
                <button className="px-3 py-2 text-sm rounded-full hover:bg-primary/20 flex items-center gap-2 text-black dark:text-white">
                  <User className="size-4" /> Sign in
                </button>
              </PopoverTrigger>
              <PopoverContent>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => navigate("/auth?role=customer")}
                    className="text-left px-3 py-2 rounded hover:bg-muted/50"
                  >
                    Customer
                  </button>
                  <button
                    onClick={() => navigate("/auth?role=vendor")}
                    className="text-left px-3 py-2 rounded hover:bg-muted/50"
                  >
                    Vendor
                  </button>
                  <button
                    onClick={() => navigate("/auth?role=admin")}
                    className="text-left px-3 py-2 rounded hover:bg-muted/50"
                  >
                    Admin
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          ) : null}
        </div>
      </div>
    ),
    [user, isVendor, isAdmin],
  );

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <RouterLink to="/" className="flex items-center gap-2">
            <div className="size-11 grid place-items-center rounded-lg bg-gradient-to-tr from-[hsl(var(--primary))] to-[hsl(var(--accent))] text-white shadow">
              <Leaf className="size-5" />
            </div>
            <div className="leading-tight">
              <div className="manrope-semibold text-lg tracking-tight">
                CraftCircle
              </div>
            </div>
          </RouterLink>
          {NavLinks}
        </div>

        <div className="flex items-center gap-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              navigate(`/products?q=${encodeURIComponent(q)}`);
            }}
            className="hidden lg:flex items-center gap-2"
          >
            <div className="relative w-[280px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search handcrafted goods..."
                className="pl-8"
              />
            </div>
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>

          {isAdmin && (
            <RouterLink to="/admin" className="hidden md:inline-flex">
              <Button variant="ghost">Admin Dashboard</Button>
            </RouterLink>
          )}

          <RouterLink to="/cart" className="relative inline-flex items-center">
            <ShoppingBag className="size-6" />
            {cartCount > 0 && (
              <span className="absolute -right-2 -top-1 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground">
                {cartCount}
              </span>
            )}
          </RouterLink>

          {/* Admin indicator and user avatar */}
          <div className="flex items-center gap-2">
            {user ? (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="w-10 h-10 rounded-full overflow-hidden border border-border">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt="avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-primary text-white grid place-items-center font-semibold">
                        {(user.displayName ||
                          user.email ||
                          "U")[0].toUpperCase()}
                      </div>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent>
                  <div className="flex flex-col gap-2">
                    <div className="font-semibold">
                      {user.displayName ?? user.email}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {user.email}
                    </div>
                    <div className="mt-2">
                      <Button asChild variant="ghost">
                        <a
                          href="/wishlist"
                          className="text-left px-3 py-2 rounded hover:bg-muted/50"
                        >
                          Wishlist
                        </a>
                      </Button>
                    </div>
                    <div className="mt-2">
                      <Button asChild variant="ghost">
                        <a
                          href="/orders"
                          className="text-left px-3 py-2 rounded hover:bg-muted/50"
                        >
                          Order history
                        </a>
                      </Button>
                    </div>
                    <div className="mt-2">
                      <Button
                        variant="ghost"
                        onClick={async () => {
                          try {
                            await signOutClient();
                            sessionStorage.removeItem("isVendor");
                            sessionStorage.removeItem("isAdmin");
                            // update local role state so header updates in this window
                            setIsVendor(false);
                            setIsAdmin(false);
                            try {
                              window.dispatchEvent(new Event("roleChange"));
                            } catch (_) {}
                          } catch (err) {
                            console.error("Sign out failed", err);
                          }
                          setUser(null);
                          navigate("/");
                        }}
                      >
                        Sign out
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            ) : null}
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Store className="size-4" /> Menu
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 flex flex-col gap-4">
                <RouterLink to="/products" className="text-sm font-medium">
                  Products
                </RouterLink>
                <RouterLink
                  to="/vendor/register"
                  className="text-sm font-medium"
                >
                  Become a Vendor
                </RouterLink>
                <RouterLink to="/reviews" className="text-sm font-medium">
                  Reviews
                </RouterLink>
                {!(user || isVendor || isAdmin) && (
                  <RouterLink
                    to="/auth?role=customer"
                    className="text-sm font-medium inline-flex items-center gap-2"
                  >
                    <User className="size-4" /> Sign in
                  </RouterLink>
                )}
                <RouterLink
                  to="/wishlist"
                  className="text-sm font-medium inline-flex items-center gap-2"
                >
                  <Heart className="size-4" /> Wishlist
                </RouterLink>
                <RouterLink
                  to="/analytics"
                  className="text-sm font-medium inline-flex items-center gap-2"
                >
                  <BarChart2 className="size-4" /> Impact Analytics
                </RouterLink>
                {typeof window !== "undefined" &&
                  sessionStorage.getItem("isAdmin") === "true" && (
                    <RouterLink
                      to="/admin"
                      className="text-sm font-medium inline-flex items-center gap-2"
                    >
                      <BarChart2 className="size-4" /> Admin Dashboard
                    </RouterLink>
                  )}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    navigate(`/products?q=${encodeURIComponent(q)}`);
                  }}
                  className="flex items-center gap-2"
                >
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search..."
                  />
                  <Button type="submit" size="sm">
                    Go
                  </Button>
                </form>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
