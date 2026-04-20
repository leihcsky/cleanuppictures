import Header from "~/components/Header";
import Footer from "~/components/Footer";
import { absoluteCanonicalUrl, getPublicSiteOriginNoSlash } from "~/libs/seoCanonical";

export async function generateMetadata({ params: { locale } }) {
  const origin = getPublicSiteOriginNoSlash();
  const canonicalUrl = absoluteCanonicalUrl(origin, locale, "terms-of-service");
  const title = "Terms of Service | Pic Cleaner";
  const description =
    "Read the terms governing your use of Pic Cleaner services, subscriptions, credits, acceptable use, and content standards (including NSFW restrictions).";
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

export default async function TermsOfServicePage({ params: { locale } }) {
  const brand = process.env.NEXT_PUBLIC_WEBSITE_NAME || 'Pic Cleaner';
  const contactEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@cleanuppictures.org';
  const effectiveDate = '2026-04-18';

  return (
    <>
      <Header locale={locale} page="terms-of-service" />
      <main className="bg-slate-50 pt-32 pb-24 min-h-screen">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 lg:p-10 shadow-sm">
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-slate-900">Terms of Service</h1>
            <p className="mt-3 text-sm text-slate-500">Effective date: {effectiveDate}</p>
            <p className="mt-5 text-slate-700 leading-7">
              These Terms of Service govern your use of {brand}. By accessing or using our services, you agree to these terms.
            </p>

            <section className="mt-8">
              <h2 className="text-xl font-semibold text-slate-900">1. Eligibility and Account</h2>
              <ul className="mt-3 space-y-2 text-slate-700 leading-7 list-disc pl-5">
                <li>You must provide accurate account and billing information.</li>
                <li>You are responsible for activity under your account credentials.</li>
                <li>You must promptly notify us of unauthorized account use.</li>
              </ul>
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-semibold text-slate-900">2. Service Description</h2>
              <p className="mt-3 text-slate-700 leading-7">
                {brand} provides AI-powered image cleanup tools. Service features may evolve and may vary by plan level, region, and technical limits.
              </p>
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-semibold text-slate-900">3. Plans, Credits, and Billing</h2>
              <ul className="mt-3 space-y-2 text-slate-700 leading-7 list-disc pl-5">
                <li>Free plans include limited usage and may have quality or speed restrictions.</li>
                <li>Paid subscriptions renew automatically unless canceled before renewal.</li>
                <li>
                  You can manage or cancel subscription renewal from <strong>Manage Subscribe</strong> under{" "}
                  <strong>Purchase History &amp; Refunds</strong>.
                </li>
                <li>Credit purchases may be offered as one-time top-ups and are consumed by successful processing actions.</li>
                <li>Displayed checkout prices are final for your order and include applicable taxes where required by law (no hidden fees).</li>
                <li>Your card issuer or bank may still apply separate currency-conversion or foreign-transaction charges outside our control.</li>
                <li>Subscription-included credits are valid only during the active billing period and do not roll over after the period ends.</li>
                <li>Failed processing does not consume credits; if a verified system-side billing error occurs, we may restore equivalent credits or provide compensation.</li>
              </ul>
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-semibold text-slate-900">4. Cancellations and Refunds</h2>
              <p className="mt-3 text-slate-700 leading-7">
                Cancellation stops future subscription renewals. Refund handling follows our Refund Policy, including eligibility windows and billing-error review.
              </p>
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-semibold text-slate-900">5. Acceptable Use</h2>
              <ul className="mt-3 space-y-2 text-slate-700 leading-7 list-disc pl-5">
                <li>No unlawful, infringing, fraudulent, or abusive use of the platform.</li>
                <li>No attempts to bypass limits, abuse APIs, scrape protected resources, or interfere with platform security.</li>
                <li>You must have rights to upload and process the content you submit.</li>
              </ul>
              <h3 className="mt-6 text-lg font-semibold text-slate-900">5.1 Content standards (including NSFW and sensitive material)</h3>
              <p className="mt-3 text-slate-700 leading-7">
                Our services are intended for lawful, professional, and general-purpose image cleanup. You must not upload, submit, or ask us to process images
                that violate applicable law or these terms, including without limitation:
              </p>
              <ul className="mt-3 space-y-2 text-slate-700 leading-7 list-disc pl-5">
                <li>
                  Child sexual abuse material (CSAM) or any sexual depiction of minors, including synthetic, illustrated, or partially clothed depictions where a
                  reasonable person would interpret the content as sexualizing minors.
                </li>
                <li>Illegal pornography or other sexually explicit content where possession, distribution, or processing is unlawful in your jurisdiction or ours.</li>
                <li>Non-consensual intimate imagery, voyeuristic content, or content that violates another person&apos;s privacy, publicity, or personality rights.</li>
                <li>
                  Graphic violence, gore, or cruelty presented for shock or exploitation where such content is restricted or unlawful, and any content that combines
                  sexual themes with violence or exploitation in a way that is prohibited by law.
                </li>
                <li>Content intended to harass, threaten, defraud, or incite violence against individuals or groups.</li>
              </ul>
              <p className="mt-3 text-slate-700 leading-7">
                We may use automated systems (including third-party content moderation and safety services) to evaluate whether submitted images meet these
                standards. Automated screening is not a legal determination and may produce false positives or false negatives. If content is flagged, assessed as
                disallowed, or otherwise suspected to violate this section or the law, we may refuse to process it, withhold or remove outputs, limit features,
                suspend or terminate accounts, and cooperate with law enforcement where required.
              </p>
              <p className="mt-3 text-slate-700 leading-7">
                You represent and warrant that images you submit comply with this section and applicable law. You must not attempt to evade moderation, overload
                screening systems, or misuse the service to distribute prohibited content.
              </p>
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-semibold text-slate-900">6. Intellectual Property</h2>
              <p className="mt-3 text-slate-700 leading-7">
                The platform, software, and brand assets remain our property. You retain rights to your uploaded content as permitted by law and your source rights.
              </p>
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-semibold text-slate-900">7. Availability and Changes</h2>
              <p className="mt-3 text-slate-700 leading-7">
                We may modify, suspend, or discontinue features at any time, including for maintenance, legal requirements, abuse prevention, or product upgrades.
              </p>
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-semibold text-slate-900">8. Disclaimer and Limitation of Liability</h2>
              <p className="mt-3 text-slate-700 leading-7">
                Services are provided on an as-available basis. To the maximum extent permitted by law, we disclaim implied warranties and limit liability for
                indirect, incidental, or consequential damages arising from your use of the service.
              </p>
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-semibold text-slate-900">9. Indemnification</h2>
              <p className="mt-3 text-slate-700 leading-7">
                You agree to indemnify and hold us harmless from claims, losses, and liabilities arising from your misuse of the service or violation of these terms.
              </p>
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-semibold text-slate-900">10. Governing Law and Disputes</h2>
              <p className="mt-3 text-slate-700 leading-7">
                Disputes will be governed by applicable law in our operating jurisdiction unless local consumer law requires otherwise. Parties agree to attempt
                good-faith resolution before formal proceedings.
              </p>
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-semibold text-slate-900">11. Contact</h2>
              <p className="mt-3 text-slate-700 leading-7">
                For legal or billing questions related to these terms, contact: {contactEmail}
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer locale={locale} page="terms-of-service" />
    </>
  )
}
