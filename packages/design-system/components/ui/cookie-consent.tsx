"use client";

import { getDictionaryForLocale } from "@repo/internationalization/client";
import { useState } from "react";
import { Button } from "./button";
import { Card, CardContent } from "./card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { Separator } from "./separator";
import { Switch } from "./switch";

export type CookieConsentDecision = {
  analytics: boolean;
};

export type CookieConsentProps = {
  /** First level. Non-modal on purpose: the product stays usable without a choice. */
  bannerOpen: boolean;
  preferencesOpen: boolean;
  onPreferencesOpenChange: (open: boolean) => void;
  locale: string;
  privacyPolicyHref: string | null;
  analyticsGranted: boolean;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onSave: (decision: CookieConsentDecision) => void;
};

type PreferencesFormProps = {
  copy: ReturnType<
    typeof getDictionaryForLocale
  >["dictionary"]["components"]["cookieConsent"]["preferences"];
  analyticsGranted: boolean;
  onSave: (decision: CookieConsentDecision) => void;
};

function PreferencesForm({
  copy,
  analyticsGranted,
  onSave,
}: PreferencesFormProps) {
  const [analytics, setAnalytics] = useState(analyticsGranted);

  return (
    <>
      <div className="flex flex-col gap-4 py-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="font-medium text-sm">{copy.necessary.title}</span>
            <p className="text-muted-foreground text-sm">
              {copy.necessary.description}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="whitespace-nowrap text-muted-foreground text-xs">
              {copy.necessary.alwaysOn}
            </span>
            <Switch aria-label={copy.necessary.title} checked disabled />
          </div>
        </div>
        <Separator />
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="font-medium text-sm">{copy.analytics.title}</span>
            <p className="text-muted-foreground text-sm">
              {copy.analytics.description}
            </p>
          </div>
          <Switch
            aria-label={copy.analytics.title}
            checked={analytics}
            className="shrink-0"
            onCheckedChange={setAnalytics}
          />
        </div>
        <Separator />
        <p className="text-muted-foreground text-xs">
          {copy.localStorageNotice}
        </p>
      </div>
      <DialogFooter>
        <Button onClick={() => onSave({ analytics })} type="button">
          {copy.save}
        </Button>
      </DialogFooter>
    </>
  );
}

export function CookieConsent({
  bannerOpen,
  preferencesOpen,
  onPreferencesOpenChange,
  locale,
  privacyPolicyHref,
  analyticsGranted,
  onAcceptAll,
  onRejectAll,
  onSave,
}: CookieConsentProps) {
  const { dictionary } = getDictionaryForLocale(locale);
  const copy = dictionary.components.cookieConsent;

  return (
    <>
      {bannerOpen && (
        <section
          aria-label={copy.banner.ariaLabel}
          className="pointer-events-none fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4"
          data-cookie-banner=""
        >
          <Card className="pointer-events-auto mx-auto max-w-4xl shadow-lg">
            <CardContent className="flex flex-col gap-4 p-4 sm:p-6">
              <div className="flex flex-col gap-1">
                <h2 className="font-semibold text-base">{copy.banner.title}</h2>
                <p className="text-muted-foreground text-sm">
                  {copy.banner.description}{" "}
                  {privacyPolicyHref && (
                    <a
                      className="text-primary underline underline-offset-4"
                      href={privacyPolicyHref}
                    >
                      {copy.banner.privacyPolicy}
                    </a>
                  )}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  className="sm:flex-1"
                  onClick={onRejectAll}
                  type="button"
                >
                  {copy.banner.rejectAll}
                </Button>
                <Button
                  className="sm:flex-1"
                  onClick={onAcceptAll}
                  type="button"
                >
                  {copy.banner.acceptAll}
                </Button>
                <Button
                  onClick={() => onPreferencesOpenChange(true)}
                  type="button"
                  variant="link"
                >
                  {copy.banner.managePreferences}
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      <Dialog onOpenChange={onPreferencesOpenChange} open={preferencesOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{copy.preferences.title}</DialogTitle>
            <DialogDescription>{copy.preferences.description}</DialogDescription>
          </DialogHeader>
          <PreferencesForm
            analyticsGranted={analyticsGranted}
            copy={copy.preferences}
            onSave={onSave}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
