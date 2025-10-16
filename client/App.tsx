import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import VendorRegister from "./pages/VendorRegister";
import Auth from "./pages/Auth";
import Signup from "./pages/Signup";
import Admin from "./pages/Admin";
import VendorDashboard from "./pages/VendorDashboard";
import WishlistPage from "./pages/Wishlist";
import OrdersPage from "./pages/Orders";
import ReviewsPage from "./pages/Reviews";
import Placeholder from "./pages/Placeholder";
import Marketplace from "./pages/Marketplace";
import CartPage from "./pages/Cart";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/vendor/register" element={<VendorRegister />} />
              {/* Placeholder routes to avoid dead links */}
              <Route path="/products" element={<Marketplace />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/vendor/dashboard" element={<VendorDashboard />} />
              <Route path="/wishlist" element={<WishlistPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/reviews" element={<ReviewsPage />} />
              <Route path="/search" element={<Placeholder />} />
              <Route path="/analytics" element={<Placeholder />} />
              <Route path="/terms" element={<Placeholder />} />
              <Route path="/privacy" element={<Placeholder />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
