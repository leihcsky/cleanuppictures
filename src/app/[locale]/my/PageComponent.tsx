'use client'
import HeadInfo from "~/components/HeadInfo";
import Header from "~/components/Header";
import Footer from "~/components/Footer";
import {useEffect, useState} from "react";
import {useCommonContext} from "~/context/common-context";
import Link from "next/link";
import {getLinkHref} from "~/configs/buildLink";
import TopBlurred from "~/components/TopBlurred";
import {createPortalLink} from "~/libs/nextAuthClient";
import {getPaymentProvider} from "~/configs/billingPolicy";

const PageComponent = ({
                         locale,
                         worksText
                       }) => {
  const [pagePath] = useState('my');
  const {
    setShowLoadingModal,
    userData,
    commonText
  } = useCommonContext();
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [refundLoadingOrderId, setRefundLoadingOrderId] = useState(0);
  const [ordersMessage, setOrdersMessage] = useState("");
  const [cancelSubLoading, setCancelSubLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [overview, setOverview] = useState<any>({
    status: 0,
    subscribed: false,
    subscription_status: "",
    plan: "",
    credits_balance: 0,
    free_remaining: 0
  });

  const paymentProvider = getPaymentProvider();
  const isLogin = Boolean(userData?.user_id);
  const subscriptionStatus = String(overview?.subscription_status || "none");
  const plan = String(overview?.plan || "");
  const credits = Number(overview?.credits_balance || 0);
  const freeRemaining = Number(overview?.free_remaining || 0);

  useEffect(() => {
    setShowLoadingModal(false);
  }, [setShowLoadingModal]);

  useEffect(() => {
    const fetchOverview = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/${locale}/api/user/getSubscriptionOverview`);
        const result = await response.json();
        setOverview(result || {});
      } finally {
        setLoading(false);
      }
    };
    fetchOverview();
  }, [locale, userData?.user_id]);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!userData?.user_id) {
        setOrders([]);
        return;
      }
      setOrdersLoading(true);
      setOrdersMessage("");
      try {
        const res = await fetch(`/api/orders/list`);
        const json = await res.json();
        setOrders(json?.orders || []);
      } catch {
        setOrdersMessage(locale === "zh" ? "订单记录加载失败，请稍后重试。" : "Failed to load order history.");
      } finally {
        setOrdersLoading(false);
      }
    };
    fetchOrders();
  }, [userData?.user_id, locale]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!userData?.user_id) {
        setHistoryItems([]);
        return;
      }
      setHistoryLoading(true);
      try {
        const res = await fetch(`/api/history/list`);
        const json = await res.json();
        setHistoryItems(json?.items || []);
      } finally {
        setHistoryLoading(false);
      }
    };
    fetchHistory();
  }, [userData?.user_id]);

  const handleRequestRefund = async (orderId: number) => {
    if (!orderId || refundLoadingOrderId > 0) return;
    setRefundLoadingOrderId(orderId);
    setOrdersMessage("");
    try {
      const res = await fetch(`/api/orders/request-refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId })
      });
      const json = await res.json();
      if (!json?.status) {
        setOrdersMessage(json?.msg || (locale === "zh" ? "退款申请失败，请稍后重试。" : "Refund request failed."));
      } else {
        setOrdersMessage(locale === "zh" ? "退款申请已提交，请等待处理结果。" : "Refund request submitted.");
        const refresh = await fetch(`/api/orders/list`);
        const listJson = await refresh.json();
        setOrders(listJson?.orders || []);
      }
    } catch {
      setOrdersMessage(locale === "zh" ? "退款申请失败，请稍后重试。" : "Refund request failed.");
    } finally {
      setRefundLoadingOrderId(0);
    }
  };

  const doCancelSubscription = async () => {
    if (cancelSubLoading) return;
    setCancelSubLoading(true);
    setOrdersMessage("");
    try {
      const res = await fetch(`/api/subscription/cancel`, { method: "POST" });
      const json = await res.json();
      if (!json?.status) {
        setOrdersMessage(json?.msg || (locale === "zh" ? "取消订阅失败，请稍后重试。" : "Failed to cancel subscription."));
      } else {
        setOrdersMessage(
          locale === "zh"
            ? "订阅已提交取消，具体状态以 Creem 返回为准。"
            : "Cancellation submitted; final state follows Creem."
        );
        const refresh = await fetch(`/api/orders/list`);
        const listJson = await refresh.json();
        setOrders(listJson?.orders || []);
      }
    } catch {
      setOrdersMessage(locale === "zh" ? "取消订阅失败，请稍后重试。" : "Failed to cancel subscription.");
    } finally {
      setCancelSubLoading(false);
    }
  };

  const handleOpenPortal = async () => {
    if (!userData?.user_id) {
      return;
    }
    setPortalError("");
    setPortalLoading(true);
    try {
      await createPortalLink(locale, userData.user_id);
    } catch (e) {
      setPortalError(locale === "zh" ? "暂时无法打开订阅管理，请稍后重试或前往定价页。" : "Failed to open subscription portal. Please try again later or go to pricing.");
    } finally {
      setPortalLoading(false);
    }
  };

  const getStatusTag = () => {
    if (!isLogin) {
      return locale === "zh" ? "未登录" : "Not logged in";
    }
    if (subscriptionStatus === "active" || subscriptionStatus === "trialing") {
      return locale === "zh" ? "订阅中" : "Active";
    }
    if (credits > 0) {
      return locale === "zh" ? "按积分使用" : "Credit plan";
    }
    return locale === "zh" ? "免费用户" : "Free plan";
  };

  return (
    <>
      <meta name="robots" content="noindex"/>
      <HeadInfo
        locale={locale}
        page={pagePath}
        title={worksText.title}
        description={worksText.description}
      />
      <Header
        locale={locale}
        page={pagePath}
      />
      <main className={"relative my-auto min-h-screen overflow-y-auto bg-slate-50 pt-28 md:pt-32"}>
        <TopBlurred/>
        <div className="mx-auto max-w-4xl px-5 pb-20">
          <div className="mx-auto flex max-w-4xl flex-col items-center text-center py-6 md:py-8">
            <h1 className="text-3xl font-bold md:text-5xl text-slate-900">
              {locale === "zh" ? "订阅与账户" : "Subscription & Account"}
            </h1>
            <p className="mt-3 text-slate-600">
              {locale === "zh" ? "查看当前订阅状态、剩余积分与免费次数。" : "View your subscription status, remaining credits, and free quota."}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">{locale === "zh" ? "账户状态" : "Account Status"}</h2>
              <span className="rounded-full bg-primary-50 px-3 py-1 text-sm font-medium text-primary-700">{getStatusTag()}</span>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">{locale === "zh" ? "订阅状态" : "Subscription"}</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{isLogin ? subscriptionStatus : (locale === "zh" ? "未登录" : "Not logged in")}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">{locale === "zh" ? "当前套餐" : "Plan"}</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{isLogin ? (plan || (locale === "zh" ? "免费" : "Free")) : "-"}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">{locale === "zh" ? "积分余额" : "Credits"}</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{isLogin ? credits : 0}</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">{locale === "zh" ? "今日免费次数剩余" : "Free daily remaining"}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{freeRemaining}</p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {!isLogin ? (
                <Link
                  href={getLinkHref(locale, '')}
                  onClick={() => setShowLoadingModal(true)}
                  className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
                >
                  {locale === "zh" ? "先去登录" : "Sign in first"}
                </Link>
              ) : (subscriptionStatus === "active" || subscriptionStatus === "trialing") ? (
                paymentProvider === "stripe" ? (
                  <button
                    onClick={handleOpenPortal}
                    disabled={portalLoading}
                    className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
                  >
                    {portalLoading ? (locale === "zh" ? "跳转中..." : "Opening...") : (locale === "zh" ? "管理订阅" : "Manage Subscription")}
                  </button>
                ) : (
                  <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
                    {locale === "zh" ? "订阅相关操作见下方订单列表。" : "Use the order list below for subscription actions."}
                  </span>
                )
              ) : (
                <Link
                  href={getLinkHref(locale, 'pricing')}
                  onClick={() => setShowLoadingModal(true)}
                  className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
                >
                  {locale === "zh" ? "升级套餐" : "Upgrade Plan"}
                </Link>
              )}
              <Link
                href={getLinkHref(locale, '')}
                onClick={() => setShowLoadingModal(true)}
                className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                {commonText.generateNew}
              </Link>
            </div>

            {(loading || portalLoading) && (
              <p className="mt-4 text-sm text-slate-500">
                {locale === "zh" ? "正在加载账户数据..." : "Loading account data..."}
              </p>
            )}
            {portalError && (
              <p className="mt-3 text-sm text-red-500">{portalError}</p>
            )}
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">{locale === "zh" ? "购买记录与退款" : "Purchase History & Refunds"}</h3>
            {!isLogin ? (
              <p className="mt-3 text-sm text-slate-500">{locale === "zh" ? "登录后可查看订单与申请退款。" : "Sign in to view orders and request refunds."}</p>
            ) : (
              <>
                {(ordersLoading || refundLoadingOrderId > 0) && (
                  <p className="mt-3 text-sm text-slate-500">{locale === "zh" ? "正在加载订单数据..." : "Loading order data..."}</p>
                )}
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2 pr-4">{locale === "zh" ? "订单号" : "Order No"}</th>
                      <th className="py-2 pr-4">{locale === "zh" ? "类型" : "Type"}</th>
                      <th className="py-2 pr-4">{locale === "zh" ? "金额" : "Amount"}</th>
                      <th className="py-2 pr-4">{locale === "zh" ? "积分" : "Credits"}</th>
                      <th className="py-2 pr-4">{locale === "zh" ? "状态" : "Status"}</th>
                      <th className="py-2 pr-4">{locale === "zh" ? "时间" : "Time"}</th>
                      <th className="py-2">{locale === "zh" ? "操作" : "Action"}</th>
                    </tr>
                    </thead>
                    <tbody>
                    {orders.length <= 0 && (
                      <tr>
                        <td className="py-4 text-slate-500" colSpan={7}>
                          {locale === "zh" ? "暂无购买记录" : "No purchase records yet"}
                        </td>
                      </tr>
                    )}
                    {orders.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100 text-slate-700">
                        <td className="py-2 pr-4 font-medium">{item.order_no || `#${item.id}`}</td>
                        <td className="py-2 pr-4">{item.order_kind}</td>
                        <td className="py-2 pr-4">{item.amount} {item.currency}</td>
                        <td className="py-2 pr-4">{item.credits}</td>
                        <td className="py-2 pr-4">{item.status}</td>
                        <td className="py-2 pr-4">{item.created_at_text || String(item.created_at || "").replace("T", " ").slice(0, 19)}</td>
                        <td className="py-2">
                          {item.can_refund ? (
                            <button
                              onClick={() => handleRequestRefund(Number(item.id))}
                              disabled={refundLoadingOrderId > 0}
                              className="rounded-md border border-rose-300 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                            >
                              {refundLoadingOrderId === Number(item.id) ? (locale === "zh" ? "提交中..." : "Submitting...") : (locale === "zh" ? "申请退款" : "Request Refund")}
                            </button>
                          ) : item.can_cancel_subscription ? (
                            <button
                              onClick={() => setShowCancelConfirm(true)}
                              disabled={cancelSubLoading}
                              className="rounded-md border border-primary-300 px-2.5 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-50 disabled:opacity-60"
                            >
                              {cancelSubLoading ? (locale === "zh" ? "提交中..." : "Submitting...") : (locale === "zh" ? "取消订阅" : "Cancel")}
                            </button>
                          ) : item.order_kind === "subscription" && paymentProvider === "stripe" ? (
                            <button
                              onClick={handleOpenPortal}
                              disabled={portalLoading}
                              className="rounded-md border border-primary-300 px-2.5 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-50 disabled:opacity-60"
                            >
                              {portalLoading ? (locale === "zh" ? "跳转中..." : "Opening...") : (locale === "zh" ? "管理订阅" : "Manage")}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    </tbody>
                  </table>
                </div>
                {ordersMessage && (
                  <p className={`mt-3 text-sm ${ordersMessage.toLowerCase().includes("failed") || ordersMessage.includes("失败") ? "text-red-500" : "text-slate-600"}`}>
                    {ordersMessage}
                  </p>
                )}
              </>
            )}
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">{locale === "zh" ? "处理记录" : "Processing History"}</h3>
            {!isLogin ? (
              <p className="mt-3 text-sm text-slate-500">{locale === "zh" ? "登录后可查看已处理图片记录。" : "Sign in to view processed image history."}</p>
            ) : (
              <>
                {historyLoading && (
                  <p className="mt-3 text-sm text-slate-500">{locale === "zh" ? "正在加载处理记录..." : "Loading history..."}</p>
                )}
                {!historyLoading && historyItems.length <= 0 && (
                  <p className="mt-3 text-sm text-slate-500">{locale === "zh" ? "暂无处理记录" : "No processing history yet"}</p>
                )}
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  {historyItems.map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="aspect-[4/3] w-full overflow-hidden rounded-lg bg-slate-100">
                        {item.result_url ? (
                          <img src={item.result_url} alt="" className="h-full w-full object-cover" />
                        ) : item.source_url ? (
                          <img src={item.source_url} alt="" className="h-full w-full object-cover opacity-80" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-slate-400">
                            {locale === "zh" ? "暂无预览" : "No preview"}
                          </div>
                        )}
                      </div>
                      <div className="mt-3 text-xs text-slate-600">
                        <p>{locale === "zh" ? "任务ID" : "Job"}: #{item.id}</p>
                        <p>{locale === "zh" ? "状态" : "Status"}: {item.status || "-"}</p>
                        <p>{locale === "zh" ? "模式" : "Mode"}: {item.mode || "-"}</p>
                        <p>{locale === "zh" ? "消耗积分" : "Credit Cost"}: {item.credit_cost || 0}</p>
                        <p>{locale === "zh" ? "时间" : "Time"}: {item.created_at_text || String(item.created_at || "").replace("T", " ").slice(0, 19)}</p>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.result_url ? (
                          <>
                            <a
                              href={item.result_url}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-md bg-primary-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-primary-700"
                            >
                              {locale === "zh" ? "查看结果" : "View"}
                            </a>
                            <a
                              href={item.result_url}
                              download
                              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-white"
                            >
                              {locale === "zh" ? "下载" : "Download"}
                            </a>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">{locale === "zh" ? "处理中或失败" : "Processing or failed"}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {showCancelConfirm && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
                <h4 className="text-base font-semibold text-slate-900">
                  {locale === "zh" ? "确认取消订阅？" : "Cancel subscription?"}
                </h4>
                <p className="mt-2 text-sm text-slate-600">
                  {locale === "zh"
                    ? "将向 Creem 发起立即取消（immediate）。取消后权益与账单以 Creem 与支付渠道为准。"
                    : "We will request immediate cancellation with Creem. Access and billing follow Creem and your payment provider."}
                </p>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={() => setShowCancelConfirm(false)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    {locale === "zh" ? "返回" : "Back"}
                  </button>
                  <button
                    onClick={async () => {
                      setShowCancelConfirm(false);
                      await doCancelSubscription();
                    }}
                    className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-700"
                  >
                    {locale === "zh" ? "确认取消" : "Confirm"}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">{locale === "zh" ? "说明" : "Notes"}</h3>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <p>{locale === "zh" ? "免费用户：每日最多 3 次标准处理。" : "Free users: up to 3 standard operations per day."}</p>
              <p>{locale === "zh" ? "高质量模式与高清导出按积分扣费。" : "High Quality mode and HD export consume credits."}</p>
              <p>{locale === "zh" ? "订阅用户可通过上方按钮进入订阅管理。" : "Subscribed users can open billing portal via the button above."}</p>
              <p>{locale === "zh" ? "积分与订阅状态均以后台实时数据为准。" : "Credits and subscription status are fetched from backend in real time."}</p>
            </div>
          </div>
        </div>
      </main>
      <Footer
        locale={locale}
        page={pagePath}
      />
    </>
  )
}

export default PageComponent
