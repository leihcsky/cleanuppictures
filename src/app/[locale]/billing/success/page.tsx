import Link from "next/link";
import { hydrateOrderFromCreemSuccessRedirect, verifyCreemRedirectSignature } from "~/servers/creemBilling";
import { CheckCircleIcon, ShieldCheckIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import Header from "~/components/Header";
import Footer from "~/components/Footer";
import TopBlurred from "~/components/TopBlurred";
import { getLinkHref } from "~/configs/buildLink";

type Props = {
  params: { locale: string };
  searchParams: Record<string, string | string[] | undefined>;
};

function one(v: string | string[] | undefined) {
  if (Array.isArray(v)) return v[0];
  return v;
}

export default async function BillingSuccessPage({ params: { locale }, searchParams }: Props) {
  const apiKey = process.env.CREEM_API_KEY || "";
  const params = {
    checkout_id: one(searchParams.checkout_id) || null,
    order_id: one(searchParams.order_id) || null,
    customer_id: one(searchParams.customer_id) || null,
    subscription_id: one(searchParams.subscription_id) || null,
    product_id: one(searchParams.product_id) || null,
    request_id: one(searchParams.request_id) || null,
    signature: one(searchParams.signature) || null
  };
  const verified = apiKey && params.signature
    ? verifyCreemRedirectSignature(params, apiKey)
    : false;
  if (verified) {
    await hydrateOrderFromCreemSuccessRedirect({
      checkoutId: params.checkout_id,
      orderId: params.order_id,
      customerId: params.customer_id,
      productId: params.product_id
    });
  }

  const isZh = locale === "zh";

  return (
    <>
      <Header locale={locale} page="billing/success" />
      <main className="relative min-h-screen bg-slate-50 pb-16 pt-28 md:pt-32">
        <TopBlurred />
        <div className="relative mx-auto max-w-4xl px-6">
          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-primary-100 via-sky-100 to-violet-100" />
            <div className="relative p-8 md:p-10">
            <div className="flex items-center gap-3">
              <div className={`rounded-full p-2 ${verified ? "bg-emerald-100" : "bg-amber-100"}`}>
                {verified ? (
                  <CheckCircleIcon className="h-7 w-7 text-emerald-600" />
                ) : (
                  <ExclamationTriangleIcon className="h-7 w-7 text-amber-600" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">
                  {isZh ? "支付已收到" : "Payment Received"}
                </h1>
                <p className="text-sm text-slate-500">
                  {isZh ? "感谢您的购买，系统已记录本次支付结果。" : "Thank you. Your billing result has been recorded."}
                </p>
              </div>
            </div>

            <div className={`mt-6 rounded-2xl border p-4 text-sm ${
              verified
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-amber-200 bg-amber-50 text-amber-800"
            }`}>
              <div className="flex items-center gap-2 font-medium">
                <ShieldCheckIcon className="h-4 w-4" />
                {verified
                  ? isZh
                    ? "跳转签名已验证"
                    : "Verified redirect signature"
                  : isZh
                    ? "未验证跳转参数"
                    : "Unverified redirect"}
              </div>
              <p className="mt-1">
                {verified
                  ? isZh
                    ? "签名验证通过。积分或订阅状态将在短时间内与账户同步。"
                    : "Signature validation passed. Credits/subscription sync will finish shortly."
                  : isZh
                    ? "支付可能仍在处理中。若 1–2 分钟内余额未更新，请联系客服。"
                    : "Payment may still be processing. If balance does not refresh in 1-2 minutes, contact support."}
              </p>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p><span className="font-medium text-slate-700">checkout_id:</span> {params.checkout_id || "-"}</p>
              <p><span className="font-medium text-slate-700">order_id:</span> {params.order_id || "-"}</p>
              <p><span className="font-medium text-slate-700">product_id:</span> {params.product_id || "-"}</p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={getLinkHref(locale, "")} className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700">
                {isZh ? "返回编辑器" : "Back to Editor"}
              </Link>
              <Link href={getLinkHref(locale, "my")} className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
                {isZh ? "查看账户与订阅" : "My account & subscription"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
      <Footer locale={locale} page="billing/success" />
    </>
  );
}

