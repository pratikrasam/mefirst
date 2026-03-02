import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Shield,
  Mic,
  MicOff,
  Save,
  Sparkles,
  Target,
  Heart,
  Check,
  Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { UserProfile } from "@shared/schema";
import { ThemeToggle } from "@/components/theme-toggle";

export default function ProfileSettingsPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: profile, isLoading } = useQuery<UserProfile | null>({
    queryKey: ["/api/profile"],
  });

  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [consentRecording, setConsentRecording] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (profile) {
      const fallbackName = `${user?.firstName || ""}${user?.lastName ? ` ${user.lastName}` : ""}`.trim();
      setDisplayName(profile.displayName || fallbackName);
      setPhone(profile.phone || "");
      setConsentRecording(profile.consentRecording || false);
    }
  }, [profile, user]);

  useEffect(() => {
    if (!profile) return;
    const origName = profile.displayName || `${user?.firstName || ""}${user?.lastName ? ` ${user.lastName}` : ""}`.trim();
    const origPhone = profile.phone || "";
    const origConsent = profile.consentRecording || false;
    setHasChanges(
      displayName !== origName ||
      phone !== origPhone ||
      consentRecording !== origConsent
    );
  }, [displayName, phone, consentRecording, profile, user]);

  const saveSettings = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", "/api/profile", {
        displayName: displayName.trim(),
        phone: phone.trim(),
        consentRecording,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      setHasChanges(false);
      toast({ title: "Settings saved", description: "Your profile has been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    },
  });

  const goalLabels: Record<string, string> = {
    fitness: "Fitness Consistency",
    energy: "Energy & Burnout",
    focus: "Productivity & Focus",
    sleep: "Sleep Routine",
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/")} data-testid="button-back-dashboard">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-serif text-xl font-bold">MeFirst</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {hasChanges && (
              <Button
                size="sm"
                onClick={() => saveSettings.mutate()}
                disabled={saveSettings.isPending}
                className="gap-1"
                data-testid="button-save-settings"
              >
                {saveSettings.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Save
              </Button>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-1"
        >
          <h1 className="font-serif text-2xl font-bold" data-testid="text-settings-title">Profile & Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your account information and preferences.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold">Personal Information</h2>
                <p className="text-xs text-muted-foreground">Your name and contact details</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-sm font-medium flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-muted-foreground" /> Name
                </Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your full name"
                  data-testid="input-settings-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground" /> Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  data-testid="input-settings-phone"
                />
                <p className="text-xs text-muted-foreground">Optional. Your coach may use this to contact you about session changes.</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" /> Email
                </Label>
                <Input
                  value={user?.email || ""}
                  disabled
                  className="bg-muted/50"
                  data-testid="input-settings-email"
                />
                <p className="text-xs text-muted-foreground">Managed by your authentication provider.</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold">Wellness Profile</h2>
                <p className="text-xs text-muted-foreground">Your coaching goals and preferences</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground flex-shrink-0">Goals</span>
                <div className="flex flex-wrap gap-1 justify-end">
                  {profile?.highLevelGoal
                    ? profile.highLevelGoal.split(",").map(g => (
                        <Badge key={g.trim()} variant="secondary" data-testid={`text-settings-goal-${g.trim()}`}>
                          {goalLabels[g.trim()] || g.trim()}
                        </Badge>
                      ))
                    : <Badge variant="secondary" data-testid="text-settings-goal">Not set</Badge>
                  }
                </div>
              </div>
              {profile?.motivation && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Motivation</span>
                  <span className="text-sm font-medium capitalize">{profile.motivation}</span>
                </div>
              )}
              {profile?.coachStyle && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">When Stuck</span>
                  <Badge variant="outline">
                    {{ push: "Someone who pushes me", reflect: "Helps me reflect", plan: "Helps me build a plan" }[profile.coachStyle] || profile.coachStyle}
                  </Badge>
                </div>
              )}
            </div>

            <Separator />

            <p className="text-xs text-muted-foreground">
              To change your wellness goal or coaching style, use the "Start over" option from your dashboard.
            </p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold">Privacy & Consent</h2>
                <p className="text-xs text-muted-foreground">Manage your privacy preferences</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-green-600" /> HIPAA Privacy Notice
                  </span>
                  <p className="text-xs text-muted-foreground">You accepted our privacy practices</p>
                </div>
                <Badge variant="secondary" className="gap-1">
                  <Check className="w-3 h-3" /> Accepted
                </Badge>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-sm font-medium flex items-center gap-2">
                    {consentRecording ? <Mic className="w-3.5 h-3.5 text-green-600" /> : <MicOff className="w-3.5 h-3.5 text-muted-foreground" />}
                    Session Recording
                  </span>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    {consentRecording
                      ? "AI-powered session analysis is enabled for your coaching sessions."
                      : "Your coach will take manual notes. AI analysis is not available."}
                  </p>
                </div>
                <Switch
                  checked={consentRecording}
                  onCheckedChange={setConsentRecording}
                  data-testid="switch-recording-consent"
                />
              </div>

              {profile?.consentDate && (
                <p className="text-xs text-muted-foreground">
                  Consent last updated: {new Date(profile.consentDate).toLocaleDateString()}
                </p>
              )}
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Heart className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold">Appearance</h2>
                <p className="text-xs text-muted-foreground">Customize your experience</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-sm font-medium">Dark Mode</span>
                <p className="text-xs text-muted-foreground">Toggle between light and dark themes</p>
              </div>
              <ThemeToggle />
            </div>
          </Card>
        </motion.div>

        {hasChanges && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="sticky bottom-6"
          >
            <Card className="p-4 bg-primary/5 border-primary/20 flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">You have unsaved changes</p>
              <Button
                onClick={() => saveSettings.mutate()}
                disabled={saveSettings.isPending}
                className="gap-2"
                data-testid="button-save-settings-bottom"
              >
                {saveSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </Button>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
