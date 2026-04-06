import { Redirect, Route, Switch } from "wouter";
import { ComponentType, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuthStore } from "./store/authStore";
import { LandingPage } from "./pages/LandingPage";
import { CreatorOffers } from "./pages/creator/Offers";
import { CreatorProfile } from "./pages/creator/Profile";
import { CreatorMessages } from "./pages/creator/Messages";
import { CreatorInvites } from "./pages/creator/Invites";
import { CreatorMyResponses } from "./pages/creator/MyResponses";
import { CreatorSocialConnect } from "./pages/creator/SocialConnect";
import { CreatorFAQ } from "./pages/creator/FAQ";
import { CreatorSupport } from "./pages/creator/Support";
import { CreatorChangePassword } from "./pages/creator/ChangePassword";
import { CreatorReferral } from "./pages/creator/Referral";
import { CreatorSuggestion } from "./pages/creator/Suggestion";
import { CustomerDashboard } from "./pages/customer/Dashboard";
import { CustomerCreateOffer } from "./pages/customer/CreateOffer";
import { CustomerOffers } from "./pages/customer/Offers";
import { CustomerCreators } from "./pages/customer/Creators";
import { CustomerOrders } from "./pages/customer/Orders";
import { CustomerProfile } from "./pages/customer/Profile";
import { CustomerMessages } from "./pages/customer/Messages";
import { CustomerNotifications } from "./pages/customer/Notifications";
import { CustomerApplications } from "./pages/customer/Applications";
import { CustomerReferral } from "./pages/customer/Referral";
import { AuthPage } from "./pages/AuthPage";
import { AboutPage } from "./pages/AboutPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { InviteModal } from "./components/InviteModal";
import { CreatorWorkApprovedModal } from "./components/CreatorWorkApprovedModal";
import { CreatorApplicationAcceptedModal } from "./components/CreatorApplicationAcceptedModal";

function getHomeRoute(role: "creator" | "customer" | null) {
  if (role === "creator") {
    return "/creator/offers";
  }

  if (role === "customer") {
    return "/customer/dashboard";
  }

  return "/auth?mode=login";
}

function ProtectedScreen({
  component: Component,
  requiredRole,
}: {
  component: ComponentType;
  requiredRole?: "creator" | "customer";
}) {
  const { user, role, logout } = useAuthStore();
  const [logoutTriggered, setLogoutTriggered] = useState(false);

  useEffect(() => {
    if (user?.email && !user.emailVerified && !logoutTriggered) {
      setLogoutTriggered(true);
      void logout();
    }
  }, [logout, logoutTriggered, user]);

  if (!user) {
    return <Redirect to="/auth?mode=login" />;
  }

  if (user.email && !user.emailVerified) {
    return <Redirect to="/auth?mode=login&verify=required" />;
  }

  if (requiredRole && role && role !== requiredRole) {
    return <Redirect to={getHomeRoute(role)} />;
  }

  return <Component />;
}

export default function App() {
  const { init, initialized } = useAuthStore();

  useEffect(() => {
    init();
  }, [init]);

  const showInitializationGate = !initialized;

  return (
    <>
      <AnimatePresence mode="wait">
        {showInitializationGate ? (
          <motion.div
            key="app-boot"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[90] bg-black"
          />
        ) : null}
      </AnimatePresence>

      {initialized && (
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">
            <Switch>
              <Route path="/" component={LandingPage} />
              <Route path="/auth" component={AuthPage} />
              <Route path="/about" component={AboutPage} />
              <Route path="/privacy" component={PrivacyPage} />

              {/* Creator Routes */}
              <Route path="/creator/offers">
                <ProtectedScreen component={CreatorOffers} requiredRole="creator" />
              </Route>
              <Route path="/creator/invites">
                <ProtectedScreen component={CreatorInvites} requiredRole="creator" />
              </Route>
              <Route path="/creator/profile">
                <ProtectedScreen component={CreatorProfile} requiredRole="creator" />
              </Route>
              <Route path="/creator/messages">
                <ProtectedScreen component={CreatorMessages} requiredRole="creator" />
              </Route>
              <Route path="/creator/my-responses">
                <ProtectedScreen component={CreatorMyResponses} requiredRole="creator" />
              </Route>
              <Route path="/creator/social-connect">
                <ProtectedScreen component={CreatorSocialConnect} requiredRole="creator" />
              </Route>
              <Route path="/creator/faq">
                <ProtectedScreen component={CreatorFAQ} requiredRole="creator" />
              </Route>
              <Route path="/creator/support">
                <ProtectedScreen component={CreatorSupport} requiredRole="creator" />
              </Route>
              <Route path="/creator/change-password">
                <ProtectedScreen component={CreatorChangePassword} requiredRole="creator" />
              </Route>
              <Route path="/creator/referral">
                <ProtectedScreen component={CreatorReferral} requiredRole="creator" />
              </Route>
              <Route path="/creator/suggestion">
                <ProtectedScreen component={CreatorSuggestion} requiredRole="creator" />
              </Route>

              {/* Customer Routes */}
              <Route path="/customer/dashboard">
                <ProtectedScreen component={CustomerDashboard} requiredRole="customer" />
              </Route>
              <Route path="/customer/create-offer">
                <ProtectedScreen component={CustomerCreateOffer} requiredRole="customer" />
              </Route>
              <Route path="/customer/offers">
                <ProtectedScreen component={CustomerOffers} requiredRole="customer" />
              </Route>
              <Route path="/customer/creators">
                <ProtectedScreen component={CustomerCreators} requiredRole="customer" />
              </Route>
              <Route path="/customer/orders">
                <ProtectedScreen component={CustomerOrders} requiredRole="customer" />
              </Route>
              <Route path="/customer/profile">
                <ProtectedScreen component={CustomerProfile} requiredRole="customer" />
              </Route>
              <Route path="/customer/messages">
                <ProtectedScreen component={CustomerMessages} requiredRole="customer" />
              </Route>
              <Route path="/customer/notifications">
                <ProtectedScreen component={CustomerNotifications} requiredRole="customer" />
              </Route>
              <Route path="/customer/applications">
                <ProtectedScreen component={CustomerApplications} requiredRole="customer" />
              </Route>
              <Route path="/customer/referral">
                <ProtectedScreen component={CustomerReferral} requiredRole="customer" />
              </Route>

              <Route>404 Not Found</Route>
            </Switch>
          </main>
          <Footer />
        </div>
      )}

      {/* Global Invite Modal - shows on all pages */}
      <InviteModal />
      <CreatorWorkApprovedModal />
      <CreatorApplicationAcceptedModal />
    </>
  );
}
