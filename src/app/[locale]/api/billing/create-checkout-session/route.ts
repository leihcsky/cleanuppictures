import { getDb } from "~/libs/db";
import { getURL } from "~/libs/helpers";
import { getCreditsByProductId, getPaymentProvider } from "~/configs/billingPolicy";
import { getCreemClient } from "~/libs/creem";
import { stripe } from "~/libs/stripe";
import { createOrRetrieveCustomer } from "~/libs/handle-stripe";
import Stripe from "stripe";
import { createOrderNo } from "~/servers/creemBilling";
import { isActiveSubscriptionStatus } from "~/libs/subscriptionStatus";

async function userHasActiveSubscription(db: ReturnType<typeof getDb>, userId: number): Promise<boolean> {
  const subRes = await db.query("select status from subscriptions where user_id=$1 order by id desc limit 1", [userId]);
  return isActiveSubscriptionStatus(subRes.rows?.[0]?.status);
}

function getLocaleFromPath(redirectUrl?: string) {
  const p = String(redirectUrl || "").replace(/^\//, "");
  const first = p.split("/")[0];
  if (first && first.length <= 8) return first;
  return "en";
}

export async function POST(req: Request) {
  const db = getDb();
  const { price, quantity = 1, redirectUrl, user_id } = await req.json();
  const userId = Number(user_id || 0);
  if (!userId || !price?.id) {
    return Response.json({ error: { message: "Invalid payload" } }, { status: 400 });
  }
  const userInfoRes = await db.query("select * from users where id = $1 limit 1", [userId]);
  const userInfo = userInfoRes.rows?.[0];
  if (!userInfo) {
    return Response.json({ error: { message: "User not found" } }, { status: 404 });
  }

  const provider = getPaymentProvider();
  const origin = getURL().replace(/\/$/, "");
  const locale = getLocaleFromPath(redirectUrl);
  const successUrl = `${origin}/${locale}/billing/success`;
  const requestId = `u${userId}_${Date.now()}`;

  if (provider === "creem") {
    let localOrderId = 0;
    try {
      const mapped = getCreditsByProductId(String(price.id));
      if (!mapped) {
        return Response.json({ error: { message: "Unknown product" } }, { status: 400 });
      }
      if (mapped.kind === "pro" && (await userHasActiveSubscription(db, userId))) {
        return Response.json(
          {
            error: {
              message:
                "You already have an active subscription. Use My account to manage billing, or buy a credit pack to top up."
            }
          },
          { status: 409 }
        );
      }
      const orderNo = createOrderNo();
      const amountUsd = Number(String(price?.amount || 0)) || 0;
      await db.query(
        "insert into orders(order_no,user_id,amount,credits,currency,product_sku,order_kind,status,provider,created_at,updated_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,now(),now())",
        [
          orderNo,
          userId,
          amountUsd > 0 ? amountUsd : null,
          Number(mapped?.credits || 0),
          "USD",
          String(price.id),
          mapped?.kind === "pro" ? "subscription" : "credit_pack",
          "pending",
          "creem"
        ]
      );
      const inserted = await db.query("select id from orders where order_no=$1 limit 1", [orderNo]);
      localOrderId = Number(inserted.rows?.[0]?.id || 0);

      const creem = getCreemClient();
      const checkout = await creem.checkouts.create({
        productId: String(price.id),
        requestId: localOrderId > 0 ? `u${userId}_o${localOrderId}_${Date.now()}` : requestId,
        successUrl,
        customer: {
          email: String(userInfo.email || "")
        },
        metadata: {
          userId: String(userId),
          localOrderId: String(localOrderId || ""),
          locale
        }
      });
      if (localOrderId > 0) {
        await db.query(
          "update orders set provider_checkout_id=$1,updated_at=now() where id=$2",
          [checkout.id, localOrderId]
        );
      }
      return Response.json({
        provider: "creem",
        checkoutUrl: checkout.checkoutUrl
      });
    } catch (err: any) {
      if (localOrderId > 0) {
        await db.query("update orders set status=$1,updated_at=now() where id=$2", ["failed", localOrderId]);
      }
      return Response.json({ error: { message: err?.message || "Creem checkout failed" } }, { status: 500 });
    }
  }

  try {
    if (price.type === "recurring" && (await userHasActiveSubscription(db, userId))) {
      return Response.json(
        {
          error: {
            message:
              "You already have an active subscription. Use My account to manage billing, or buy a credit pack to top up."
          }
        },
        { status: 409 }
      );
    }
    const customer = await createOrRetrieveCustomer({
      user_id: String(userId),
      email: String(userInfo.email || "")
    });
    let session: Stripe.Response<Stripe.Checkout.Session> | undefined;
    if (price.type === "recurring") {
      session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        billing_address_collection: "auto",
        customer,
        customer_update: { address: "auto" },
        line_items: [{ price: String(price.id), quantity }],
        mode: "subscription",
        allow_promotion_codes: true,
        subscription_data: { metadata: { userId: String(userId), requestId } },
        success_url: successUrl,
        cancel_url: successUrl
      });
    } else {
      session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        billing_address_collection: "auto",
        customer,
        customer_update: { address: "auto" },
        line_items: [{ price: String(price.id), quantity }],
        mode: "payment",
        allow_promotion_codes: true,
        success_url: successUrl,
        cancel_url: successUrl
      });
    }
    return Response.json({
      provider: "stripe",
      sessionId: session.id
    });
  } catch (err: any) {
    return Response.json({ error: { message: err?.message || "Stripe checkout failed" } }, { status: 500 });
  }
}

