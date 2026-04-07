import Header from "~/components/Header";
import Footer from "~/components/Footer";

export async function generateMetadata({ params: { locale } }) {
  const origin =
    (process.env.NEXT_PUBLIC_WEBSITE_URL || process.env.NEXT_PUBLIC_WEBSITE_ORIGIN || '').replace(/\/$/, '');
  const canonicalUrl = origin ? `${origin}/${locale}/privacy-policy` : `/${locale}/privacy-policy`;
  const title = "Privacy Policy | Pic Cleaner";
  const description = "Read how Pic Cleaner collects, uses, stores, and protects your data when you use our AI image cleanup services.";
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

export default async function PrivacyPolicyPage({ params: { locale } }) {
  const brand = process.env.NEXT_PUBLIC_WEBSITE_NAME || 'Pic Cleaner';
  const contactEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@cleanuppictures.org';
  const effectiveDate = '2026-04-01';

  return (
    <>
      <Header locale={locale} page="privacy-policy" />
      <main className="bg-slate-50 pt-32 pb-24 min-h-screen">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 lg:p-10 shadow-sm">
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-slate-900">Privacy Policy</h1>
            <p className="mt-3 text-sm text-slate-500">Effective date: {effectiveDate}</p>
            <p className="mt-5 text-slate-700 leading-7">
              This Privacy Policy explains how {brand} collects, uses, stores, and protects information when you use our website and AI image cleanup services.
              By using our services, you agree to this policy.
            </p>

            <section className="mt-8">
              <h2 className="text-xl font-semibold text-slate-900">1. Information We Collect</h2>
              <ul className="mt-3 space-y-2 text-slate-700 leading-7 list-disc pl-5">
                <li>Account information, such as email address and profile data when you sign in.</li>
                <li>Usage data, such as feature usage, request counts, and device/browser metadata.</li>
                <li>Payment-related identifiers from payment processors for subscriptions or credit purchases.</li>
                <li>Uploaded and generated image data needed to provide processing and download features.</li>
              </ul>
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-semibold text-slate-900">2. How We Use Information</h2>
              <ul className="mt-3 space-y-2 text-slate-700 leading-7 list-disc pl-5">
                <li>Provide and maintain image cleanup features, account access, and purchase flows.</li>
                <li>Prevent abuse, enforce limits, and protect system security.</li>
                <li>Improve product quality, reliability, and performance.</li>
                <li>Comply with legal obligations and resolve disputes.</li>
              </ul>
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-semibold text-slate-900">3. Payments</h2>
              <p className="mt-3 text-slate-700 leading-7">
                We use third-party payment providers to process purchases. We do not store full card numbers on our servers. Payment providers may process
                your billing data under their own privacy terms.
              </p>
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-semibold text-slate-900">4. Data Retention</h2>
              <p className="mt-3 text-slate-700 leading-7">
                We retain data only as long as needed for service operation, security, legal compliance, and billing records. We may remove inactive or
                temporary processing data after operational windows expire.
              </p>
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-semibold text-slate-900">5. Data Sharing</h2>
              <p className="mt-3 text-slate-700 leading-7">
                We do not sell personal data. We may share limited information with service providers that help us run hosting, authentication, storage,
                analytics, and payments. We may also disclose information when required by law.
              </p>
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-semibold text-slate-900">6. Security</h2>
              <p className="mt-3 text-slate-700 leading-7">
                We apply reasonable technical and organizational safeguards to protect data. No method of transmission or storage is completely secure, so
                absolute security cannot be guaranteed.
              </p>
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-semibold text-slate-900">7. Your Rights</h2>
              <p className="mt-3 text-slate-700 leading-7">
                You may request access, correction, or deletion of your account data where applicable. Contact us by email to submit a privacy request.
              </p>
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-semibold text-slate-900">8. Children&apos;s Privacy</h2>
              <p className="mt-3 text-slate-700 leading-7">
                Our services are not intended for children under 13. We do not knowingly collect personal information from children under 13.
              </p>
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-semibold text-slate-900">9. Policy Updates</h2>
              <p className="mt-3 text-slate-700 leading-7">
                We may update this policy from time to time. If material changes are made, we will update the effective date and publish the revised policy on this page.
              </p>
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-semibold text-slate-900">10. Contact</h2>
              <p className="mt-3 text-slate-700 leading-7">
                For privacy questions or requests, contact: {contactEmail}
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer locale={locale} page="privacy-policy" />
    </>
  )
}
