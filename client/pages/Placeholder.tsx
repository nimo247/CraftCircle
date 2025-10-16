import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const TITLE_MAP: Record<string, string> = {
  "/products": "Products",
  "/cart": "Your Cart",
  "/auth": "Sign in / Sign up",
  "/vendor/dashboard": "Vendor Dashboard",
  "/reviews": "Reviews",
  "/search": "Search",
  "/analytics": "Impact Analytics",
  "/terms": "Terms of Service",
  "/privacy": "Privacy Policy",
};

export default function Placeholder() {
  const location = useLocation();
  const base = location.pathname as keyof typeof TITLE_MAP;
  const title = TITLE_MAP[base] ?? "Page";

  return (
    <div className="container py-16">
      <Card>
        <CardContent className="py-12 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            This page is a placeholder. Tell me what you want here, and I'll
            build it out next.
          </p>
          <div className="mt-6 inline-flex gap-3">
            <Button asChild>
              <a href="/">Back to home</a>
            </Button>
            {base !== "/vendor/register" && (
              <Button variant="secondary" asChild>
                <a href="/vendor/register">Become a Vendor</a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
