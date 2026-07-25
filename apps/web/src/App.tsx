import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "./components/ProtectedRoute";
import { CheckoutPage } from "./pages/CheckoutPage";
import { DashboardPage } from "./pages/DashboardPage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { PaymentCompletePage } from "./pages/PaymentCompletePage";
import { PaymentPage } from "./pages/PaymentPage";
import { PaymentSettingsPage } from "./pages/PaymentSettingsPage";
import { ProductEditPage } from "./pages/ProductEditPage";
import { ProductLandingPage } from "./pages/ProductLandingPage";
import { ProductNewPage } from "./pages/ProductNewPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/p/:slug" element={<ProductLandingPage />} />
        <Route path="/pay/:orderId" element={<PaymentPage />} />
        <Route path="/checkout/:productId" element={<CheckoutPage />} />
        <Route path="/payment/complete" element={<PaymentCompletePage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/settings/payment" element={<PaymentSettingsPage />} />
          <Route path="/products/new" element={<ProductNewPage />} />
          <Route path="/products/:id" element={<ProductEditPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
