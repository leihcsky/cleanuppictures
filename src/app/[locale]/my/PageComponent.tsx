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
  const [overview, setOverview] = useState<any>({
    status: 0,
    subscribed: false,
    subscription_status: "",
    plan: "",
    credits_balance: 0,
    free_remaining: 0
  });

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
        const query = userData?.user_id ? `?userId=${userData.user_id}` : "";
        const response = await fetch(`/api/user/getSubscriptionOverview${query}`);
        const result = await response.json();
        setOverview(result || {});
      } finally {
        setLoading(false);
      }
    };
    fetchOverview();
  }, [userData?.user_id]);

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
                <button
                  onClick={handleOpenPortal}
                  disabled={portalLoading}
                  className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
                >
                  {portalLoading ? (locale === "zh" ? "跳转中..." : "Opening...") : (locale === "zh" ? "管理订阅" : "Manage Subscription")}
                </button>
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
