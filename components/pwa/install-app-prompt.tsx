"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "coshare-pwa-install-dismissed";

function isStandalone(): boolean {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  if (typeof window === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

type BeforeInstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

export function InstallAppPrompt() {
  const [mode, setMode] = useState<"android" | "ios" | null>(null);
  const [deferred, setDeferred] = useState<BeforeInstallPrompt | null>(null);
  const androidOffered = useRef(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (sessionStorage.getItem(DISMISS_KEY) === "1") return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      androidOffered.current = true;
      setDeferred(e as BeforeInstallPrompt);
      setMode("android");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    const timer = window.setTimeout(() => {
      if (androidOffered.current || sessionStorage.getItem(DISMISS_KEY) === "1") return;
      if (isIos()) setMode("ios");
    }, 2500);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.clearTimeout(timer);
    };
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setMode(null);
    setDeferred(null);
  };

  const runInstall = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch {
      // user dismissed native sheet
    }
    dismiss();
  };

  if (!mode) return null;

  return (
    <div
      className={cn(
        "fixed left-3 right-3 z-[35] rounded-2xl border border-[color:var(--line)] bg-[color:var(--paper)]/95 p-3 shadow-lg backdrop-blur-md md:left-auto md:right-8 md:max-w-sm",
        "bottom-[calc(5.25rem+env(safe-area-inset-bottom))] md:bottom-8"
      )}
      role="region"
      aria-label="Install this app"
    >
      <div className="flex gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color:var(--vermilion)]/15 text-[color:var(--vermilion)]"
          aria-hidden
        >
          {mode === "android" ? <Download className="h-5 w-5" /> : <Share className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-semibold text-[color:var(--ink)]">
            {mode === "android" ? "Install Kosher CoShare" : "Add to your home screen"}
          </p>
          <p className="text-xs leading-snug text-[color:var(--ink-muted)]">
            {mode === "android"
              ? "Open from your home screen like a native app — works offline for basic pages."
              : "In Safari, tap Share, then “Add to Home Screen” to install this app."}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {mode === "android" && deferred ? (
              <Button
                type="button"
                variant="vermilion"
                size="sm"
                className="h-8 rounded-xl px-3 text-xs"
                onClick={() => void runInstall()}
              >
                Install
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 rounded-xl px-2 text-xs text-[color:var(--ink-muted)]"
              onClick={dismiss}
            >
              Not now
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-lg p-1 text-[color:var(--ink-muted)] hover:bg-[color:var(--paper-2)] hover:text-[color:var(--ink)]"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
