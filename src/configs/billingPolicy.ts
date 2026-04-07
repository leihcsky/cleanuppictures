export type BillingCheckoutType = 'recurring' | 'one_time';

type RawOffer = {
  priceId: string;
  checkoutType: BillingCheckoutType;
  priceDisplay: string;
  credits: number;
};

const MONTHLY_SUBSCRIPTION: RawOffer = {
  priceId: 'price_starter_monthly',
  checkoutType: 'recurring',
  priceDisplay: '$7.9',
  credits: 120
};

const CREDIT_PACKS: RawOffer[] = [
  {
    priceId: 'price_credit_100',
    checkoutType: 'one_time',
    priceDisplay: '$5',
    credits: 50
  },
  {
    priceId: 'price_credit_500',
    checkoutType: 'one_time',
    priceDisplay: '$10',
    credits: 120
  }
];

export function getMonthlySubscriptionOffer(locale: string) {
  const isZh = locale === 'zh';
  return {
    ...MONTHLY_SUBSCRIPTION,
    title: isZh ? '月订阅计划' : 'Monthly Subscription',
    creditsLabel: isZh ? `${MONTHLY_SUBSCRIPTION.credits} 积分` : `${MONTHLY_SUBSCRIPTION.credits} credits`,
    summary: isZh
      ? `${MONTHLY_SUBSCRIPTION.priceDisplay} / 月 · ${MONTHLY_SUBSCRIPTION.credits} 积分`
      : `${MONTHLY_SUBSCRIPTION.priceDisplay} / month · ${MONTHLY_SUBSCRIPTION.credits} credits`
  };
}

export function getCreditPackOffers(locale: string) {
  const isZh = locale === 'zh';
  return CREDIT_PACKS.map((item, index) => ({
    ...item,
    title: isZh ? `积分包（${index === 0 ? '小' : '大'}）` : `Credit Pack (${index === 0 ? 'Small' : 'Large'})`,
    creditsLabel: isZh ? `${item.credits} 积分` : `${item.credits} credits`,
    summary: isZh ? `${item.priceDisplay} · ${item.credits} 积分` : `${item.priceDisplay} · ${item.credits} credits`
  }));
}
