export type BillingCheckoutType = 'recurring' | 'one_time';
export type PaymentProvider = 'creem' | 'stripe';

type RawOffer = {
  priceId: string;
  checkoutType: BillingCheckoutType;
  priceDisplay: string;
  credits: number;
  kind: 'pro' | 'paygo';
};

const MONTHLY_SUBSCRIPTION: RawOffer = {
  priceId: process.env.NEXT_PUBLIC_CREEM_PRODUCT_PRO_MONTHLY || 'prod_monthly_120',
  checkoutType: 'recurring',
  priceDisplay: '$9.9',
  credits: 120,
  kind: 'pro'
};

const CREDIT_PACKS: RawOffer[] = [
  {
    priceId: process.env.NEXT_PUBLIC_CREEM_PRODUCT_CREDITS_50 || 'prod_credits_50',
    checkoutType: 'one_time',
    priceDisplay: '$5.9',
    credits: 50,
    kind: 'paygo'
  },
  {
    priceId: process.env.NEXT_PUBLIC_CREEM_PRODUCT_CREDITS_120 || 'prod_credits_120',
    checkoutType: 'one_time',
    priceDisplay: '$11.9',
    credits: 120,
    kind: 'paygo'
  }
];

export function getPaymentProvider(): PaymentProvider {
  const configured = (process.env.NEXT_PUBLIC_PAYMENT_PROVIDER || process.env.PAYMENT_PROVIDER || 'creem').toLowerCase();
  return configured === 'stripe' ? 'stripe' : 'creem';
}

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

export function getCreditsByProductId(productId: string) {
  const target = String(productId || '');
  if (target === MONTHLY_SUBSCRIPTION.priceId) {
    return { kind: MONTHLY_SUBSCRIPTION.kind, credits: MONTHLY_SUBSCRIPTION.credits };
  }
  const pack = CREDIT_PACKS.find((item) => item.priceId === target);
  if (!pack) return null;
  return { kind: pack.kind, credits: pack.credits };
}
