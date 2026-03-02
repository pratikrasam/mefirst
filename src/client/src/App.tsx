import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/use-auth";
import { getQueryFn } from "@/lib/queryClient";
import LandingPage from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import OnboardingPage from "@/pages/onboarding";
import QuestionnairePage from "@/pages/questionnaire";
import CoachingMatchPage from "@/pages/coaching-match";
import BookingPage from "@/pages/booking";
import CoachDashboard from "@/pages/coach-dashboard";
import CoachRegisterPage from "@/pages/coach-register";
import AssistantChatPage from "@/pages/assistant-chat";
import ConsentPage from "@/pages/consent";
import ProfileSettingsPage from "@/pages/profile-settings";
import NotFound from "@/pages/not-found";
import type { UserProfile } from "@shared/schema";

function AuthenticatedRoutes() {
  const { data: profile, isLoading } = useQuery<UserProfile | null>({
    queryKey: ["/api/profile"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-primary/20 animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (profile?.role === "coach") {
    return (
      <Switch>
        <Route path="/" component={CoachDashboard} />
        <Route path="/coach-register" component={CoachRegisterPage} />
        <Route component={CoachDashboard} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/onboarding" component={OnboardingPage} />
      <Route path="/questionnaire" component={QuestionnairePage} />
      <Route path="/coaching-match" component={CoachingMatchPage} />
      <Route path="/booking" component={BookingPage} />
      <Route path="/consent" component={ConsentPage} />
      <Route path="/profile" component={ProfileSettingsPage} />
      <Route path="/assistant" component={AssistantChatPage} />
      <Route path="/coach-register" component={CoachRegisterPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-primary/20 animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route component={LandingPage} />
      </Switch>
    );
  }

  return <AuthenticatedRoutes />;
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
