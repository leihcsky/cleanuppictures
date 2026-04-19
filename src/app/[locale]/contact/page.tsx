import Header from "~/components/Header";
import Footer from "~/components/Footer";
import { ContactEmailCard } from "~/components/ContactEmailCard";
import Link from "next/link";
import { getLinkHref } from "~/configs/buildLink";
import { absoluteCanonicalUrl, getPublicSiteOriginNoSlash } from "~/libs/seoCanonical";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  const origin = getPublicSiteOriginNoSlash();
  const canonicalUrl = absoluteCanonicalUrl(origin, locale, "contact");
  const title = "Contact Us | Pic Cleaner";
  const description =
    "Get help with billing, subscriptions, technical issues, or feedback. Reach our team by email—we respond as soon as we can.";
  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      locale,
      type: "website",
      url: canonicalUrl
    },
    twitter: {
      card: "summary",
      title,
      description
    },
    ...(origin ? { metadataBase: new URL(origin) } : {})
  };
}

export default function ContactPage({ params: { locale } }: { params: { locale: string } }) {
  const brand = process.env.NEXT_PUBLIC_WEBSITE_NAME || "Pic Cleaner";
  const contactEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@cleanuppictures.org";
  const origin = getPublicSiteOriginNoSlash();
  const pageUrl = absoluteCanonicalUrl(origin, locale, "contact");
  const isZh = locale === "zh";

  const t = {
    h1: isZh ? "联系我们" : "Contact us",
    lead: isZh
      ? `如有关于 ${brand} 的问题，我们很乐意通过邮件为您提供帮助。`
      : `Questions about ${brand}? We are happy to help by email.`,
    emailIntro: isZh ? "首选联系方式" : "Primary contact",
    emailHint: isZh
      ? "发送邮件时请尽量说明问题类型、浏览器与大致操作步骤，便于我们更快处理。"
      : "Include the topic, your browser, and steps you took so we can respond faster.",
    copy: isZh ? "复制邮箱" : "Copy email",
    copied: isZh ? "已复制" : "Copied",
    mailCta: isZh ? "用邮件客户端打开" : "Open in email app",
    topicsTitle: isZh ? "我们可以协助的内容" : "What we can help with",
    topics: isZh
      ? [
          { title: "账单与订阅", body: "发票、扣款、套餐变更、退款政策说明等。" },
          { title: "账户与登录", body: "无法登录、Google 登录、账户信息等。" },
          { title: "产品与功能", body: "上传失败、处理报错、导出格式或工具使用疑问。" },
          { title: "反馈与建议", body: "功能建议或体验反馈，我们会认真阅读。" }
        ]
      : [
          { title: "Billing & subscriptions", body: "Charges, invoices, plan changes, and refund policy questions." },
          { title: "Account & sign-in", body: "Google sign-in, access issues, and account details." },
          { title: "Product & features", body: "Upload errors, processing failures, exports, and how to use the tools." },
          { title: "Feedback", body: "Ideas and product feedback—we read every message." }
        ],
    responseTitle: isZh ? "回复时间" : "Response time",
    responseBody: isZh
      ? "我们通常在几个工作日内回复；高峰期可能略长。紧急账单问题请在主题中注明「Billing」。"
      : "We usually reply within a few business days; it may take longer during peak periods. Put “Billing” in the subject line for urgent payment issues.",
    legalTitle: isZh ? "法律与合规" : "Legal & compliance",
    legalBody: isZh ? (
      <>
        与条款、隐私或内容政策相关的问题，请参阅{" "}
        <Link href={getLinkHref(locale, "terms-of-service")} className="font-medium text-primary-600 hover:text-primary-700">
          服务条款
        </Link>{" "}
        与{" "}
        <Link href={getLinkHref(locale, "privacy-policy")} className="font-medium text-primary-600 hover:text-primary-700">
          隐私政策
        </Link>
        ；联系时请一并说明您的诉求。
      </>
    ) : (
      <>
        For questions about terms, privacy, or content policies, see our{" "}
        <Link href={getLinkHref(locale, "terms-of-service")} className="font-medium text-primary-600 hover:text-primary-700">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href={getLinkHref(locale, "privacy-policy")} className="font-medium text-primary-600 hover:text-primary-700">
          Privacy Policy
        </Link>
        , and describe your request in your email.
      </>
    ),
    pricingCta: isZh ? "查看定价与套餐" : "View pricing & plans",
    myCta: isZh ? "管理订阅与账户" : "Manage subscription & account"
  };

  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "ContactPage",
      name: t.h1,
      description: isZh ? `联系 ${brand}` : `Contact ${brand}`,
      url: pageUrl,
      inLanguage: locale
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: brand,
      url: origin || undefined,
      email: contactEmail
    }
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <Header locale={locale} page="contact" />
      <main className="bg-slate-50 pt-32 pb-24 min-h-screen">
        <div className="mx-auto max-w-3xl px-6 lg:px-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 lg:p-10 shadow-sm">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 lg:text-4xl">{t.h1}</h1>
            <p className="mt-4 text-lg text-slate-600 leading-relaxed">{t.lead}</p>

            <section className="mt-10" aria-labelledby="contact-email">
              <h2 id="contact-email" className="text-lg font-semibold text-slate-900">
                {t.emailIntro}
              </h2>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{t.emailHint}</p>
              <div className="mt-4">
                <ContactEmailCard
                  email={contactEmail}
                  copyLabel={t.copy}
                  copiedLabel={t.copied}
                  mailCta={t.mailCta}
                />
              </div>
            </section>

            <section className="mt-12" aria-labelledby="contact-topics">
              <h2 id="contact-topics" className="text-lg font-semibold text-slate-900">
                {t.topicsTitle}
              </h2>
              <ul className="mt-4 space-y-4">
                {t.topics.map((item) => (
                  <li
                    key={item.title}
                    className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 text-left shadow-sm"
                  >
                    <p className="font-medium text-slate-900">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-600 leading-relaxed">{item.body}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-10 rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3 text-sm text-amber-950/90">
              <p className="font-semibold text-amber-950">{t.responseTitle}</p>
              <p className="mt-1 leading-relaxed">{t.responseBody}</p>
            </section>

            <section className="mt-10 text-sm text-slate-600 leading-relaxed">
              <h2 className="text-base font-semibold text-slate-900">{t.legalTitle}</h2>
              <p className="mt-2">{t.legalBody}</p>
            </section>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href={getLinkHref(locale, "pricing")}
                className="inline-flex items-center justify-center rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition-colors"
              >
                {t.pricingCta}
              </Link>
              <Link
                href={getLinkHref(locale, "my")}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:border-primary-200 hover:bg-slate-50 transition-colors"
              >
                {t.myCta}
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer locale={locale} page="contact" />
    </>
  );
}
