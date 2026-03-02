import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Mic, MicOff, Lock, Eye, Trash2, Check, ChevronDown, ChevronUp } from "lucide-react";
import { motion } from "framer-motion";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ConsentPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [hipaaAccepted, setHipaaAccepted] = useState(false);
  const [recordingConsent, setRecordingConsent] = useState<boolean | null>(null);
  const [showFullPolicy, setShowFullPolicy] = useState(false);

  const submitConsent = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", "/api/profile", {
        consentHipaa: true,
        consentRecording: recordingConsent === true,
        consentDate: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({ title: "Consent recorded", description: "Your preferences have been saved securely." });
      setLocation("/");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save consent. Please try again.", variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <h1 className="font-serif text-3xl font-bold" data-testid="text-consent-title">Your Privacy & Consent</h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Before we begin, please review our privacy practices and recording preferences.
          </p>
        </div>

        <Card className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="space-y-3">
              <h2 className="font-semibold text-base">HIPAA Privacy Notice</h2>

              <div className={`text-sm text-muted-foreground leading-relaxed space-y-3 ${!showFullPolicy ? "line-clamp-4" : ""}`}>
                <p>
                  We are committed to protecting the privacy and security of your protected health information (PHI)
                  in accordance with the Health Insurance Portability and Accountability Act (HIPAA). As a hybrid coaching
                  platform, we use secure technology to support both your human coach and our AI-assisted tools.
                </p>
                <p>
                  Information you share during sessions, including audio recordings (if consented), transcripts, messages,
                  goals, reflections, and progress data may be used to generate session summaries, track accountability,
                  and support continuity of care.
                </p>
                <p>
                  All PHI is encrypted in transit and at rest, and access is restricted to authorized personnel and your
                  assigned coach. Your information is never sold or used for marketing purposes.
                </p>
                <p>
                  You have the right to access, request corrections to, or request restrictions on the use of your PHI,
                  and you may withdraw consent for optional features (such as session recording) at any time.
                </p>
                <p>
                  Our AI tools function solely to assist with documentation and structured summaries under the supervision
                  of your coach and do not make independent clinical decisions.
                </p>
                <p>
                  We retain your information only as long as necessary to provide services and comply with legal obligations.
                </p>
              </div>

              <button
                onClick={() => setShowFullPolicy(!showFullPolicy)}
                className="text-xs text-primary hover:underline flex items-center gap-1"
                data-testid="button-toggle-policy"
              >
                {showFullPolicy ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {showFullPolicy ? "Show less" : "Read full policy"}
              </button>

              <div className="flex items-start gap-3 pt-2 border-t">
                <button
                  onClick={() => setHipaaAccepted(!hipaaAccepted)}
                  className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    hipaaAccepted
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-muted-foreground/40 hover:border-primary"
                  }`}
                  data-testid="checkbox-hipaa-consent"
                >
                  {hipaaAccepted && <Check className="w-3 h-3" />}
                </button>
                <p className="text-sm">
                  I have read and agree to the privacy practices described above. I understand how my health information
                  will be used and protected.
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <Mic className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="space-y-3 flex-1">
              <h2 className="font-semibold text-base">Session Recording Consent</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                To help your coach focus fully on you, we use secure audio transcription to generate session notes.
              </p>

              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mic className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <span>Audio only (no video stored)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <span>Used only for documentation</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <span>HIPAA-compliant & encrypted</span>
                </div>
                <div className="flex items-center gap-2">
                  <Trash2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <span>You can opt out anytime</span>
                </div>
              </div>

              <p className="text-sm font-medium pt-2">
                Do you consent to audio recording for note-taking purposes?
              </p>

              <div className="flex gap-3">
                <Button
                  variant={recordingConsent === true ? "default" : "outline"}
                  onClick={() => setRecordingConsent(true)}
                  className="flex-1 gap-2"
                  data-testid="button-consent-recording-yes"
                >
                  <Mic className="w-4 h-4" />
                  Yes, I consent
                </Button>
                <Button
                  variant={recordingConsent === false ? "default" : "outline"}
                  onClick={() => setRecordingConsent(false)}
                  className={`flex-1 gap-2 ${recordingConsent === false ? "bg-muted-foreground hover:bg-muted-foreground/90" : ""}`}
                  data-testid="button-consent-recording-no"
                >
                  <MicOff className="w-4 h-4" />
                  No, do not record
                </Button>
              </div>

              {recordingConsent === false && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-3"
                >
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    Without recording consent, your coach will take manual notes during sessions.
                    AI-powered session analysis will not be available. You can change this preference at any time from your settings.
                  </p>
                </motion.div>
              )}
            </div>
          </div>
        </Card>

        <div className="flex justify-center pt-2">
          <Button
            size="lg"
            disabled={!hipaaAccepted || recordingConsent === null || submitConsent.isPending}
            onClick={() => submitConsent.mutate()}
            className="gap-2 px-8"
            data-testid="button-submit-consent"
          >
            {submitConsent.isPending ? "Saving..." : "Continue to Dashboard"}
            {!submitConsent.isPending && <Check className="w-4 h-4" />}
          </Button>
        </div>

        {(!hipaaAccepted || recordingConsent === null) && (
          <p className="text-xs text-muted-foreground text-center">
            {!hipaaAccepted && recordingConsent === null
              ? "Please accept the privacy notice and select a recording preference to continue."
              : !hipaaAccepted
                ? "Please accept the privacy notice to continue."
                : "Please select a recording preference to continue."}
          </p>
        )}
      </motion.div>
    </div>
  );
}
