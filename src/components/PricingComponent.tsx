import {getStripe} from '~/libs/stripeClient';
import React, {useState} from 'react';
import {useCommonContext} from "~/context/common-context";
import {priceList} from "~/configs/stripeConfig";

const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

export default function Pricing({
                                  redirectUrl,
                                  isPricing = false
                                }) {
  const [priceIdLoading, setPriceIdLoading] = useState<string>();
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
  
  const {
    setShowLoginModal,
    userData,
    pricingText
  } = useCommonContext();

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
      id: 'free',
      title: pricingText.freeTitle,
      price: pricingText.freePrice,
      period: '',
      description: pricingText.freeCredits,
      features: [
        pricingText.freeFeature1,
        pricingText.freeFeature2,
        pricingText.freeFeature3,
        pricingText.freeFeature4,
      ],
      buttonText: pricingText.freeBtn,
      buttonAction: () => window.location.href = '/',
      isPopular: false,
    },
    {
      id: period === 'monthly' ? 'price_starter_monthly' : 'price_starter_yearly',
      title: pricingText.starterTitle,
      price: period === 'monthly' ? pricingText.starterPriceMonth : pricingText.starterPriceYear,
      period: pricingText.perMonth,
      description: pricingText.starterCredits,
      features: [
        pricingText.starterFeature1,
        pricingText.starterFeature2,
        pricingText.starterFeature3,
        pricingText.starterFeature4,
        pricingText.starterFeature5,
      ],
      buttonText: pricingText.starterBtn,
      buttonAction: () => handleCheckout(period === 'monthly' ? 'price_starter_monthly' : 'price_starter_yearly', 'recurring'),
      isPopular: false,
    },
    {
      id: period === 'monthly' ? 'price_pro_monthly' : 'price_pro_yearly',
      title: pricingText.proTitle,
      price: period === 'monthly' ? pricingText.proPriceMonth : pricingText.proPriceYear,
      period: pricingText.perMonth,
      description: pricingText.proCredits,
      features: [
        pricingText.proFeature1,
        pricingText.proFeature2,
        pricingText.proFeature3,
        pricingText.proFeature4,
        pricingText.proFeature5,
      ],
      buttonText: pricingText.proBtn,
      buttonAction: () => handleCheckout(period === 'monthly' ? 'price_pro_monthly' : 'price_pro_yearly', 'recurring'),
      isPopular: true,
    },
  ];

  const credits = [
    { credits: pricingText.payGoOption1, price: pricingText.payGoPrice1, id: 'price_credit_100' },
    { credits: pricingText.payGoOption2, price: pricingText.payGoPrice2, id: 'price_credit_500' },
    { credits: pricingText.payGoOption3, price: pricingText.payGoPrice3, id: 'price_credit_1500' },
  ];

  return (
    <section className={(isPricing ? "py-24" : "py-12") + " bg-slate-50"}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            {pricingText.h1Text}
          </h2>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            {pricingText.description}
          </p>
        </div>

        {/* Toggle */}
        <div className="flex justify-center mb-12">
          <div className="relative flex bg-slate-200 rounded-full p-1">
            <button
              onClick={() => setPeriod('monthly')}
              className={`${
                period === 'monthly' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900'
              } relative rounded-full py-2 px-6 text-sm font-semibold whitespace-nowrap focus:outline-none transition-all duration-200`}
            >
              {pricingText.monthly}
            </button>
            <button
              onClick={() => setPeriod('yearly')}
              className={`${
                period === 'yearly' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900'
              } relative rounded-full py-2 px-6 text-sm font-semibold whitespace-nowrap focus:outline-none transition-all duration-200`}
            >
              {pricingText.yearly}
              <span className="absolute -top-3 -right-3 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                {pricingText.saveText}
              </span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 mb-20">
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
                {period === 'yearly' && plan.price !== '$0' && (
                  <p className="mt-1 text-sm text-slate-500">{pricingText.billedYearly}</p>
                )}
                 {period === 'monthly' && plan.price !== '$0' && (
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
            </div>
          ))}
        </div>

        {/* Pay As You Go & Credits Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Pay As You Go */}
          <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">{pricingText.payGoTitle}</h3>
            <p className="text-slate-600 mb-8">{pricingText.payGoDesc}</p>
            
            <div className="space-y-4">
              {credits.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 rounded-lg border border-slate-100 bg-slate-50 hover:border-blue-200 transition-colors">
                  <span className="font-semibold text-slate-900">{item.credits}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-xl font-bold text-slate-900">{item.price}</span>
                    <button
                      onClick={() => handleCheckout(item.id, 'one_time')}
                      disabled={!!priceIdLoading}
                      className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-blue-600 shadow-sm ring-1 ring-inset ring-blue-300 hover:bg-blue-50 disabled:opacity-70"
                    >
                       {priceIdLoading === item.id ? '...' : pricingText.payGoBtn}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* How Credits Work */}
          <div className="rounded-2xl bg-slate-900 p-8 shadow-sm text-white">
            <h3 className="text-2xl font-bold mb-6">{pricingText.creditExplTitle}</h3>
            <p className="text-slate-300 mb-8">{pricingText.creditExplDesc}</p>
            
            <ul className="space-y-6">
              <li className="flex gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 ring-1 ring-blue-500/20">
                  <span className="text-xl">🖼️</span>
                </div>
                <div>
                  <h4 className="font-semibold">{pricingText.creditExpl1}</h4>
                </div>
              </li>
              <li className="flex gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 ring-1 ring-blue-500/20">
                  <span className="text-xl">✨</span>
                </div>
                <div>
                  <h4 className="font-semibold">{pricingText.creditExpl2}</h4>
                </div>
              </li>
              <li className="flex gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 ring-1 ring-blue-500/20">
                  <span className="text-xl">🔄</span>
                </div>
                <div>
                  <h4 className="font-semibold">{pricingText.creditExpl3}</h4>
                </div>
              </li>
            </ul>
          </div>
        </div>

      </div>
    </section>
  );
}
