import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";
import { DashboardPage } from "./pages/DashboardPage";
import { SubscriptionsPage } from "./pages/SubscriptionsPage";
import { NewSubscriptionPage } from "./pages/NewSubscriptionPage";
import { PodsPage } from "./pages/PodsPage";
import { NewPodPage } from "./pages/NewPodPage";
import { PodDetailsPage } from "./pages/PodDetailsPage";
import { FriendsPage } from "./pages/FriendsPage";
import { InvitesPage } from "./pages/InvitesPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { OperationsPage } from "./pages/OperationsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { SettingsPage } from "./pages/SettingsPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/" element={<AppLayout />}>
        <Route path="login" element={<LoginPage />} />
        <Route path="login/verify" element={<VerifyEmailPage />} />
        <Route path="pods" element={<PodsPage />} />
        <Route path="pods/:id" element={<PodDetailsPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="subscriptions" element={<SubscriptionsPage />} />
          <Route path="subscriptions/new" element={<NewSubscriptionPage />} />
          <Route path="friends" element={<FriendsPage />} />
          <Route path="invites" element={<InvitesPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="operations" element={<OperationsPage />} />
          <Route path="pods/new" element={<NewPodPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
