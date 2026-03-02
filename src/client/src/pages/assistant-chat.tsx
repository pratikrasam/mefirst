import { useState, useRef, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, LogOut, ArrowLeft, Send, Loader2, CalendarCheck, Trophy, MessageSquare, TrendingUp, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import type { Assistant, AssistantConversation, Booking, UserProfile } from "@shared/schema";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function AssistantChatPage() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: assistant, isLoading: assistantLoading } = useQuery<Assistant | null>({
    queryKey: ["/api/assistant"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: conversation } = useQuery<AssistantConversation | null>({
    queryKey: ["/api/assistant/conversation"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: bookings } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: profile } = useQuery<UserProfile | null>({
    queryKey: ["/api/profile"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const hasUpcomingSessionWithin48h = useMemo(() => {
    if (!bookings) return false;
    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    return bookings.some(
      (b) => (b.status === "approved" || b.status === "pending") && new Date(b.scheduledAt) >= now && new Date(b.scheduledAt) <= in48h
    );
  }, [bookings]);

  const nextSession = useMemo(() => {
    if (!bookings) return null;
    const now = new Date();
    const upcoming = bookings
      .filter((b) => (b.status === "approved" || b.status === "pending") && new Date(b.scheduledAt) >= now)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    return upcoming[0] || null;
  }, [bookings]);

  const contextSuggestions = useMemo(() => {
    const suggestions: Array<{ text: string; icon: typeof CalendarCheck }> = [];

    if (hasUpcomingSessionWithin48h) {
      suggestions.push({ text: "Help me prepare for my session", icon: CalendarCheck });
    }

    suggestions.push(
      { text: "How's my week going?", icon: MessageSquare },
      { text: "I completed my homework!", icon: Trophy },
      { text: "I had a win today!", icon: TrendingUp },
      { text: "I'm struggling with...", icon: AlertCircle },
    );

    return suggestions;
  }, [hasUpcomingSessionWithin48h]);

  const assignMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/assistant/assign");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assistant"] });
    },
  });

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", "/api/assistant/chat", { message });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assistant/conversation"] });
    },
  });

  const messages: ChatMessage[] = (conversation?.messages as ChatMessage[]) || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, chatMutation.isPending]);

  useEffect(() => {
    if (!assistantLoading && !assistant) {
      assignMutation.mutate();
    }
  }, [assistantLoading, assistant]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || chatMutation.isPending) return;
    setInput("");
    chatMutation.mutate(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (assistantLoading || assignMutation.isPending) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-primary/20 animate-pulse" />
          <p className="text-sm text-muted-foreground">Finding your wellness assistant...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/")}
              data-testid="button-back-dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            {assistant && (
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-lg">
                  {assistant.avatarEmoji}
                </div>
                <div>
                  <p className="text-sm font-semibold leading-tight" data-testid="text-assistant-name">
                    {assistant.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{assistant.specialty}</p>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={() => logout()} data-testid="button-logout">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="flex-1 max-w-4xl w-full mx-auto flex flex-col">
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {messages.length === 0 && assistant && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12 space-y-4"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-3xl mx-auto">
                {assistant.avatarEmoji}
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <h2 className="font-serif text-xl font-bold" data-testid="text-assistant-welcome">
                  Meet {assistant.name}
                </h2>
                <p className="text-sm text-muted-foreground">{assistant.bio}</p>
                <Badge variant="secondary" className="mt-2">{assistant.specialty}</Badge>
              </div>
              <div className="pt-4 space-y-2">
                <p className="text-xs text-muted-foreground">Try asking about:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {contextSuggestions.map((suggestion) => (
                    <Button
                      key={suggestion.text}
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1.5"
                      onClick={() => {
                        setInput(suggestion.text);
                        textareaRef.current?.focus();
                      }}
                      data-testid={`button-suggestion-${suggestion.text.slice(0, 15).replace(/\s/g, '-').replace(/[^a-zA-Z0-9-]/g, '')}`}
                    >
                      <suggestion.icon className="w-3 h-3" />
                      {suggestion.text}
                    </Button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {messages.length > 0 && messages.length % 6 === 0 && !chatMutation.isPending && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="py-3"
              data-testid="checkin-prompt"
            >
              <Card className="p-3 max-w-lg mx-auto">
                <p className="text-xs text-muted-foreground text-center mb-2">Share how you're doing</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {contextSuggestions.slice(0, 3).map((suggestion) => (
                    <Button
                      key={suggestion.text}
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1.5"
                      onClick={() => {
                        setInput(suggestion.text);
                        textareaRef.current?.focus();
                      }}
                      data-testid={`button-checkin-${suggestion.text.slice(0, 15).replace(/\s/g, '-').replace(/[^a-zA-Z0-9-]/g, '')}`}
                    >
                      <suggestion.icon className="w-3 h-3" />
                      {suggestion.text}
                    </Button>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`flex items-start gap-2.5 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  {msg.role === "assistant" && assistant && (
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
                      {assistant.avatarEmoji}
                    </div>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted rounded-bl-md"
                    }`}
                    data-testid={`message-${msg.role}-${i}`}
                  >
                    {msg.content.split("\n").map((line, li) => (
                      <span key={li}>
                        {line}
                        {li < msg.content.split("\n").length - 1 && <br />}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {chatMutation.isPending && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="flex items-start gap-2.5">
                {assistant && (
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
                    {assistant.avatarEmoji}
                  </div>
                )}
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3" data-testid="indicator-typing">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="border-t bg-background/80 backdrop-blur-md px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${assistant?.name || "your assistant"}...`}
              className="min-h-[44px] max-h-[120px] resize-none"
              rows={1}
              disabled={chatMutation.isPending}
              data-testid="input-chat-message"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || chatMutation.isPending}
              size="icon"
              className="flex-shrink-0 h-[44px] w-[44px]"
              data-testid="button-send-message"
            >
              {chatMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Your AI wellness coach follows NBHWC guidelines and cannot provide medical advice or diagnoses.
          </p>
        </div>
      </div>
    </div>
  );
}
