import Header from "~/components/Header";
import Footer from "~/components/Footer";

export async function generateMetadata({ params: { locale } }) {
  const origin =
    (process.env.NEXT_PUBLIC_WEBSITE_URL || process.env.NEXT_PUBLIC_WEBSITE_ORIGIN || '').replace(/\/$/, '');
  const canonicalUrl = origin ? `${origin}/${locale}/refund-policy` : `/${locale}/refund-policy`;
  const title = "Refund Policy | Pic Cleaner";
  const description = "Read the refund policy for Pic Cleaner subscriptions and credit purchases.";

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      locale,
      type: 'website',
      url: canonicalUrl
    },
    twitter: {
      card: 'summary',
      title,
      description
    },
    ...(origin ? { metadataBase: new URL(origin) } : {})
  }
}

export default async function RefundPolicyPage({ params: { locale } }) {
  const brand = process.env.NEXT_PUBLIC_WEBSITE_NAME || 'Pic Cleaner';
  const contactEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@cleanuppictures.org';
  const effectiveDate = '2026-04-01';

  return (
    <>
      <Header locale={locale} page="refund-policy" />
      <main className="bg-slate-50 pt-32 pb-24 min-h-screen">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 lg:p-10 shadow-sm">
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-slate-900">Refund Policy</h1>
            <p className="mt-3 text-sm text-slate-500">Effective date: {effectiveDate}</p>
            <p className="mt-5 text-slate-700 leading-7">
              This Refund Policy explains when refunds may be granted for purchases made on {brand}.
            </p>

            <section className="mt-8">
              <h2 className="text-xl font-semibold text-slate-900">1. Digital Service Nature</h2>
              <p className="mt-3 text-slate-700 leading-7">
                {brand} provides digital processing services and credits. Because services are delivered instantly, not all purchases are refundable.
              </p>
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-semibold text-slate-900">2. Credit Purchases (Pay-as-you-go)</h2>
              <ul className="mt-3 space-y-2 text-slate-700 leading-7 list-disc pl-5">
                <li>Unused credits may be eligible for refund within 7 days of purchase.</li>
                <li>Partially used credit packages are generally non-refundable.</li>
                <li>Credits consumed by successful processing are non-refundable.</li>
              </ul>
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-semibold text-slate-900">3. Subscription (Pro Plan)</h2>
              <ul className="mt-3 space-y-2 text-slate-700 leading-7 list-disc pl-5">
                <li>You can cancel subscription renewal at any time from your billing portal.</li>
                <li>Cancellation stops future charges and does not retroactively refund prior billing periods.</li>
                <li>Subscription-included credits are valid only for the current billing period and expire at period end (no rollover).</li>
                <li>If charged due to a verified billing error, we will investigate and issue refunds when applicable.</li>
              </ul>
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-semibold text-slate-900">4. Failed Processing and Billing Errors</h2>
              <p className="mt-3 text-slate-700 leading-7">
                Failed processing is not billed. If a processing request fails and credits were incorrectly deducted due to a verified system-side issue,
                we will correct the deduction or provide an equivalent credit adjustment after verification.
              </p>
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-semibold text-slate-900">5. Non-Refundable Cases</h2>
              <ul className="mt-3 space-y-2 text-slate-700 leading-7 list-disc pl-5">
                <li>Requests made after the eligible refund window.</li>
                <li>Used services or consumed credits without verified platform fault.</li>
                <li>Abuse, fraud, or violation of Terms of Service.</li>
              </ul>
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-semibold text-slate-900">6. How to Request a Refund</h2>
              <p className="mt-3 text-slate-700 leading-7">
                Contact {contactEmail} with your account email, order details, and reason for the request. We usually respond within 3 business days.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer locale={locale} page="refund-policy" />
    </>
  )
}
