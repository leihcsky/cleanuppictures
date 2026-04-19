"use client";

import { useCallback, useState } from "react";
import { ClipboardDocumentIcon, EnvelopeIcon } from "@heroicons/react/24/outline";

type Props = {
  email: string;
  copyLabel: string;
  copiedLabel: string;
  mailCta: string;
};

export function ContactEmailCard({ email, copyLabel, copiedLabel, mailCta }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [email]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
            <EnvelopeIcon className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">{email}</p>
            <a
              href={`mailto:${email}?subject=${encodeURIComponent("Question about CleanupPictures")}`}
              className="mt-1 inline-flex text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              {mailCta}
            </a>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:border-primary-200 hover:bg-primary-50/60 hover:text-primary-800 transition-colors"
        >
          <ClipboardDocumentIcon className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />
          {copied ? copiedLabel : copyLabel}
        </button>
      </div>
    </div>
  );
}
