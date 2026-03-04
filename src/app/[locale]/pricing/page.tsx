import { CheckIcon } from '@heroicons/react/20/solid'

export async function generateMetadata({ params: { locale } }) {
  const languageModule = await import('~/i18n/languageText');
  const pricingText = await languageModule.getPricingText();
  
  return {
    title: pricingText.title,
    description: pricingText.description,
  }
}

export default async function PricingPage({ params: { locale } }) {
  const languageModule = await import('~/i18n/languageText');
  const pricingText = await languageModule.getPricingText();

  const tiers = [
    {
      name: pricingText.freeTitle,
      id: 'tier-free',
      href: '#',
      priceMonthly: pricingText.freePrice,
      description: pricingText.freeCredits,
      features: [pricingText.freeFeature1, pricingText.freeFeature2, pricingText.freeFeature3, pricingText.freeFeature4],
      mostPopular: false,
      btnText: pricingText.freeBtn,
    },
    {
      name: pricingText.starterTitle,
      id: 'tier-starter',
      href: '#',
      priceMonthly: pricingText.starterPriceMonth,
      description: pricingText.starterCredits,
      features: [pricingText.starterFeature1, pricingText.starterFeature2, pricingText.starterFeature3, pricingText.starterFeature4, pricingText.starterFeature5],
      mostPopular: false,
      btnText: pricingText.starterBtn,
    },
    {
      name: pricingText.proTitle,
      id: 'tier-pro',
      href: '#',
      priceMonthly: pricingText.proPriceMonth,
      description: pricingText.proCredits,
      features: [pricingText.proFeature1, pricingText.proFeature2, pricingText.proFeature3, pricingText.proFeature4, pricingText.proFeature5],
      mostPopular: true,
      btnText: pricingText.proBtn,
    },
    {
      name: pricingText.businessTitle,
      id: 'tier-business',
      href: '#',
      priceMonthly: pricingText.businessPriceMonth,
      description: pricingText.businessCredits,
      features: [pricingText.businessFeature1, pricingText.businessFeature2, pricingText.businessFeature3, pricingText.businessFeature4, pricingText.businessFeature5],
      mostPopular: false,
      btnText: pricingText.businessBtn,
    },
  ]

  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-base font-semibold leading-7 text-primary-600">{pricingText.title.split(' | ')[0]}</h2>
          <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            {pricingText.h1Text}
          </p>
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-8 text-gray-600">
          {pricingText.description}
        </p>
        <div className="isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-y-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-4">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={`flex flex-col justify-between rounded-3xl bg-white p-8 ring-1 ring-gray-200 xl:p-10 ${tier.mostPopular ? 'ring-2 ring-primary-600' : ''}`}
            >
              <div>
                <div className="flex items-center justify-between gap-x-4">
                  <h3
                    id={tier.id}
                    className={`text-lg font-semibold leading-8 ${tier.mostPopular ? 'text-primary-600' : 'text-gray-900'}`}
                  >
                    {tier.name}
                  </h3>
                  {tier.mostPopular ? (
                    <span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold leading-5 text-primary-600">
                      {pricingText.popularTag}
                    </span>
                  ) : null}
                </div>
                <p className="mt-4 text-sm leading-6 text-gray-600">{tier.description}</p>
                <p className="mt-6 flex items-baseline gap-x-1">
                  <span className="text-4xl font-bold tracking-tight text-gray-900">{tier.priceMonthly}</span>
                  <span className="text-sm font-semibold leading-6 text-gray-600">{pricingText.perMonth}</span>
                </p>
                <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-600">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex gap-x-3">
                      <CheckIcon className="h-6 w-5 flex-none text-primary-600" aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <a
                href={tier.href}
                aria-describedby={tier.id}
                className={`mt-8 block rounded-md px-3 py-2 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                  tier.mostPopular
                    ? 'bg-primary-600 text-white shadow-sm hover:bg-primary-500 focus-visible:outline-primary-600'
                    : 'bg-primary-50 text-primary-600 hover:bg-primary-100'
                }`}
              >
                {tier.btnText}
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
