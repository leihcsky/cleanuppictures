import {getStripe} from '~/libs/stripeClient';
import React, {useState} from 'react';
import {useCommonContext} from "~/context/common-context";
import Link from "next/link";
import { getLinkHref } from "~/configs/buildLink";
import { getCreditPackOffers, getMonthlySubscriptionOffer } from "~/configs/billingPolicy";

const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

export default function Pricing({
                                  redirectUrl,
                                  isPricing = false,
                                  locale = 'en'
                                }) {
  const [priceIdLoading, setPriceIdLoading] = useState<string>();
  const monthlySubscription = getMonthlySubscriptionOffer(locale);
  const creditPackOffers = getCreditPackOffers(locale);
  
  const {
    setShowLoginModal,
    userData,
    pricingText
  } = useCommonContext();
  const isZh = locale === 'zh';

  const handleCheckout = async (priceId: string, type: 'recurring' | 'one_time') => {
    setPriceIdLoading(priceId);
    if (!userData || !userData.user_id) {
      setShowLoginModal(true);
      setPriceIdLoading(undefined);
      return;
    }
    const user_id = userData.user_id;
    try {
      const price = { id: priceId, type }; 
      
      const data = {
        price,
        redirectUrl,
        user_id
      };
      const url = `/api/stripe/create-checkout-session`;
      const response = await fetch(url, {
        method: 'POST',
        headers: new Headers({'Content-Type': 'application/json'}),
        credentials: 'same-origin',
        body: JSON.stringify(data)
      });
      const res = await response.json();
      if (res.error) {
          alert(res.error);
          return;
      }
      const sessionId = res.sessionId;
      const stripe = await getStripe();
      stripe?.redirectToCheckout({sessionId});
    } catch (error) {
      return alert((error as Error)?.message);
    } finally {
      setPriceIdLoading(undefined);
    }
  };

  const plans = [
    {
      kind: 'free',
      id: 'free',
      title: pricingText.freeTitle,
      price: pricingText.freePrice,
      period: '',
      description: isZh ? '快速试用与轻度编辑。' : 'For quick trials and light edits.',
      features: [
        isZh ? '每日 3 次免费 Standard 处理' : '3 free Standard edits per day',
        isZh ? '仅支持 Standard cleanup' : 'Standard cleanup only',
        isZh ? '不包含高质量模式' : 'No High Quality mode',
        isZh ? '输出分辨率有限' : 'Limited output resolution',
      ],
      buttonText: pricingText.freeBtn,
      buttonAction: () => window.location.href = '/',
      isPopular: false,
    },
    {
      kind: 'paygo',
      id: 'paygo',
      title: pricingText.payGoTitle,
      price: locale === 'zh' ? `低至 ${creditPackOffers[0]?.priceDisplay || '$5'}` : `From ${creditPackOffers[0]?.priceDisplay || '$5'}`,
      period: '',
      description: isZh ? '按需付费，灵活使用不过期。' : 'Flexible pay-per-use with no expiry.',
      features: [
        isZh ? '按使用付费，不浪费预算' : 'Pay only for what you use',
        isZh ? '标准模式与高质量模式均可使用' : 'Standard and High Quality included',
        isZh ? 'HD 下载已包含' : 'HD downloads included',
        isZh ? '额度永久有效' : 'Balance never expires',
      ],
      buttonText: pricingText.payGoBtn,
      buttonAction: () => handleCheckout(creditPackOffers[0]?.priceId || 'price_credit_100', 'one_time'),
      isPopular: true,
    },
    {
      kind: 'pro',
      id: monthlySubscription.priceId,
      title: pricingText.proTitle,
      price: monthlySubscription.priceDisplay,
      period: pricingText.perMonth,
      description: isZh
        ? `每月 ${monthlySubscription.credits} 积分，适合高频用户`
        : `${monthlySubscription.credits} credits/month for frequent users`,
      features: [
        isZh ? '包含全部功能' : 'All features included',
        isZh ? 'High Quality 更省积分（Pro 价）' : 'High Quality uses fewer credits (Pro rate)',
        isZh ? 'HD 下载已包含' : 'HD downloads included',
        isZh ? '处理更快' : 'Faster processing',
        isZh ? '优先处理通道' : 'Priority access',
      ],
      buttonText: pricingText.proBtn,
      buttonAction: () => handleCheckout(monthlySubscription.priceId, 'recurring'),
      isPopular: false,
    },
  ];

  const credits = creditPackOffers.map((item) => ({
    credits: item.creditsLabel,
    price: item.priceDisplay,
    id: item.priceId
  }));
  const pricingFaqs = locale === 'zh'
    ? [
      {
        q: '免费用户每天可以处理多少次？',
        a: '免费版每天可进行 3 次标准处理。达到上限后，可购买按量额度或升级 Pro 继续使用。'
      },
      {
        q: '按量购买的额度会过期吗？',
        a: '不会。按量购买的额度永久有效，可随时用于后续编辑。'
      },
      {
        q: '订阅积分会结转到下个月吗？',
        a: '不会。订阅包含的积分仅在当期订阅周期内有效，到期作废；不会累计到下个月。'
      },
      {
        q: 'Pro 相对按量有什么优势？',
        a: '按月给到稳定额度，并享有更快队列与优先处理，适合经常使用高质量模式的用户。'
      },
      {
        q: 'Pro 和按量付费，单次处理消耗的积分一样吗？',
        a: '不完全一样。同等能力下，Pro 往往在高质量、HD 等环节更省积分；按量则按次计价、简单透明。每次具体扣多少以工具页（编辑器）里的实时提示为准。'
      },
      {
        q: '什么时候会计费？',
        a: '仅在成功生成可用结果后才会扣除积分；处理失败不扣费。若遇到系统错误（例如服务端异常/中断），可联系客服核查并补偿。'
      },
      {
        q: '我可以先订阅 Pro，再额外购买按量额度吗？',
        a: '可以。若月度用量用尽，仍可按量加购以继续编辑。'
      },
      {
        q: '支持退款吗？',
        a: '请查看 Refund Policy。若有账单问题，可联系 support@cleanuppictures.org。'
      },
      {
        q: '为什么我看不到某些支付方式？',
        a: '可用支付方式由 Stripe 和你的地区决定。若当前方式不可用，建议更换卡种或地区后重试。'
      }
    ]
    : [
      {
        q: 'How many free edits do I get each day?',
        a: 'The Free plan includes 3 standard edits per day. After that, you can buy pay-as-you-go balance or upgrade to Pro.'
      },
      {
        q: 'Does pay-as-you-go balance expire?',
        a: 'No. Purchased balance never expires and stays available for future edits.'
      },
      {
        q: 'Do subscription credits roll over?',
        a: 'No. Subscription credits are valid only within the current billing period and expire at the end of the period.'
      },
      {
        q: 'What are the advantages of Pro over pay-as-you-go?',
        a: 'A predictable monthly allowance, faster queueing, and priority processing—great if you use High Quality often.'
      },
      {
        q: 'Do Pro and pay-as-you-go use the same credits per run?',
        a: 'Not always. For the same capability, Pro is often more credit-efficient on High Quality and HD, while pay-as-you-go is straightforward per-use pricing. The exact amount per run is shown on the tool page.'
      },
      {
        q: 'When am I charged?',
        a: 'Credits are deducted only after a successful result. Failed runs are not billed. If you hit a system error (e.g. server-side failure), contact support and we can review and compensate when appropriate.'
      },
      {
        q: 'Can I subscribe to Pro and buy pay-as-you-go add-ons?',
        a: 'Yes. If you use your monthly allowance, you can top up with pay-as-you-go anytime.'
      },
      {
        q: 'Do you offer refunds?',
        a: 'Please review our Refund Policy. For billing issues, contact support@cleanuppictures.org.'
      },
      {
        q: 'Why are some payment methods unavailable?',
        a: 'Available payment methods are determined by Stripe and your region. If one method is unavailable, try another card or payment option.'
      }
    ];

  return (
    <section className={(isPricing ? "py-24" : "py-12") + " bg-slate-50"}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            {isZh ? '更好结果，简单定价' : 'Better results, simple pricing'}
          </h2>
          <p className="mt-3 text-sm font-medium text-slate-600">
            {isZh ? '无隐藏费用——所见即所付。' : 'No hidden fees — what you see is what you pay.'}
          </p>
          <p className="mt-4 text-sm text-slate-500">
            By purchasing, you agree to our{" "}
            <Link href={getLinkHref(locale, 'terms-of-service')} className="text-blue-700 hover:text-blue-800 underline underline-offset-2">Terms of Service</Link>
            ,{" "}
            <Link href={getLinkHref(locale, 'privacy-policy')} className="text-blue-700 hover:text-blue-800 underline underline-offset-2">Privacy Policy</Link>
            {" "}and{" "}
            <Link href={getLinkHref(locale, 'refund-policy')} className="text-blue-700 hover:text-blue-800 underline underline-offset-2">Refund Policy</Link>.
          </p>
        </div>
        {/* Plans Grid */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 mb-12">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative flex flex-col rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200 transition-all hover:shadow-lg ${
                plan.isPopular ? 'ring-2 ring-blue-600 shadow-md scale-105 z-10' : ''
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-4 py-1 text-sm font-semibold text-white shadow-sm">
                  {pricingText.popularTag}
                </div>
              )}
              
              <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-900">{plan.title}</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-bold tracking-tight text-slate-900">{plan.price}</span>
                  {plan.period && (
                    <span className="text-sm font-semibold leading-6 text-slate-600 ml-1">{plan.period}</span>
                  )}
                </div>
                {plan.kind === 'pro' && (
                  <p className="mt-1 text-sm text-slate-500">{pricingText.billedMonthly}</p>
                )}
                <p className="mt-4 text-sm font-medium text-blue-600">{plan.description}</p>
              </div>

              <ul role="list" className="mb-8 space-y-4 flex-1">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckIcon className="h-6 w-5 flex-none text-blue-600" />
                    <span className="text-sm text-slate-600">{feature}</span>
                  </li>
                ))}
              </ul>
              {plan.kind === 'paygo' && (
                <div className="mb-6 space-y-2">
                  {credits.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{item.credits}</p>
                        <p className="text-xs text-slate-500">{item.price}</p>
                      </div>
                      <button
                        onClick={() => handleCheckout(item.id, 'one_time')}
                        disabled={!!priceIdLoading}
                        className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 shadow-sm ring-1 ring-inset ring-blue-300 hover:bg-blue-50 disabled:opacity-70"
                      >
                        {priceIdLoading === item.id ? '...' : (locale === 'zh' ? '购买' : 'Buy')}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {plan.kind !== 'paygo' && (
                <button
                  onClick={plan.buttonAction}
                  disabled={!!priceIdLoading}
                  className={`w-full rounded-lg px-4 py-2.5 text-center text-sm font-semibold shadow-sm transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                    plan.isPopular
                      ? 'bg-blue-600 text-white hover:bg-blue-500 focus-visible:outline-blue-600'
                      : 'bg-slate-900 text-white hover:bg-slate-800 focus-visible:outline-slate-900'
                  } ${priceIdLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {priceIdLoading === plan.id ? 'Processing...' : plan.buttonText}
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="mb-12 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
          <h3 className="text-lg font-semibold text-slate-900">
            {isZh ? 'Why upgrade to Pro？' : 'Why upgrade to Pro?'}
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>{isZh ? '高质量输出更干净、更清晰' : 'High Quality output is cleaner and sharper'}</li>
            <li>{isZh ? '复杂图片更容易处理成功' : 'Handle difficult images with more confidence'}</li>
            <li>{isZh ? '高级能力（如高质量模式）更划算' : 'Better deal on premium modes like High Quality'}</li>
            <li>{isZh ? '更快处理与优先通道' : 'Faster processing and priority access'}</li>
          </ul>
        </div>

        <div className="mb-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-2xl font-bold text-slate-900">{isZh ? '标准 vs 高质量' : 'Standard vs High Quality'}</h3>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-3 pr-4 text-left font-semibold text-slate-600">{isZh ? '维度' : 'Dimension'}</th>
                  <th className="py-3 px-4 text-center font-semibold text-slate-600">{isZh ? '标准' : 'Standard'}</th>
                  <th className="py-3 pl-4 text-center font-semibold text-slate-900">{isZh ? '高质量' : 'High Quality'}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-3 pr-4 text-slate-700">{isZh ? '单次消耗' : 'Credits per run'}</td>
                  <td className="py-3 px-4 text-center text-slate-700">{isZh ? '1 积分' : '1 credit'}</td>
                  <td className="py-3 pl-4 text-center text-emerald-700">{isZh ? '按量 2 / Pro 1' : 'Pay-Go 2 / Pro 1'}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-3 pr-4 text-slate-700">{isZh ? '适用计划' : 'Available in'}</td>
                  <td className="py-3 px-4 text-center text-slate-700">{isZh ? 'Free / 按量 / Pro' : 'Free / Pay-Go / Pro'}</td>
                  <td className="py-3 pl-4 text-center text-slate-700">{isZh ? '按量 / Pro' : 'Pay-Go / Pro'}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-3 pr-4 text-slate-700">{isZh ? '结果质量' : 'Output quality'}</td>
                  <td className="py-3 px-4 text-center text-slate-700">{isZh ? '基础清理' : 'Base cleanup'}</td>
                  <td className="py-3 pl-4 text-center text-emerald-600">{isZh ? '更干净、更清晰' : 'Cleaner and sharper'}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-3 pr-4 text-slate-700">{isZh ? 'HD 下载' : 'HD download'}</td>
                  <td className="py-3 px-4 text-center text-slate-700">{isZh ? '按规则可用' : 'Available by plan rules'}</td>
                  <td className="py-3 pl-4 text-center text-emerald-600">{isZh ? '包含或更省' : 'Included or more efficient'}</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 text-slate-700">{isZh ? '升级价值' : 'Upgrade value'}</td>
                  <td className="py-3 px-4 text-center text-slate-700">{isZh ? '满足基础需求' : 'Good for baseline tasks'}</td>
                  <td className="py-3 pl-4 text-center text-emerald-600">{isZh ? '更稳定拿到高质量结果' : 'Higher quality, more consistently'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-12 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-end justify-between gap-4">
            <h3 className="text-2xl font-bold text-slate-900">{locale === 'zh' ? '常见问题（Billing FAQ）' : 'Frequently Asked Billing Questions'}</h3>
            <p className="text-xs text-slate-500">{locale === 'zh' ? '覆盖下单前最常见问题' : 'Answers to the most common pre-purchase questions'}</p>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            {pricingFaqs.map((item, idx) => (
              <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-900">{item.q}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-10 text-center">
          <p className="text-xs text-slate-500">
            Need help with billing? Contact{" "}
            <a href="mailto:support@cleanuppictures.org" className="text-blue-700 hover:text-blue-800 underline underline-offset-2">
              support@cleanuppictures.org
            </a>
          </p>
        </div>

      </div>
    </section>
  );
}
