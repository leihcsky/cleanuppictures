'use client'
import { useEffect, useState } from 'react'
import { Dialog } from '@headlessui/react'
import { Bars3Icon, XMarkIcon, CurrencyDollarIcon, Squares2X2Icon, SparklesIcon, EnvelopeIcon, TagIcon, UserCircleIcon, ArrowLeftStartOnRectangleIcon } from '@heroicons/react/24/outline'
import { GlobeAltIcon } from '@heroicons/react/24/outline'
import { Fragment } from 'react'
import { Menu, Transition } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/20/solid'
import Link from "next/link";
import { usePathname } from "next/navigation";
import { languages } from "~/i18n/config";
import { useCommonContext } from '~/context/common-context'
import LoadingModal from "./LoadingModal";
import GeneratingModal from "~/components/GeneratingModal";
import LoginButton from './LoginButton';
import LoginModal from './LoginModal';
import LogoutModal from "./LogoutModal";
import { getLinkHref } from "~/configs/buildLink";

export default function Header({
  locale,
  page
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const {
    setShowLoadingModal,
    setShowLogoutModal,
    userData,
    commonText,
    authText,
    menuText
  } = useCommonContext();
  const pathname = usePathname();

  const [pageResult] = useState(getLinkHref(locale, page))
  const isLoggedIn = Boolean(userData && userData.email);
  const [overview, setOverview] = useState<any>({
    credits_balance: 0,
    subscription_status: '',
    plan: ''
  });

  useEffect(() => {
    const fetchOverview = async () => {
      if (!userData?.user_id) {
        setOverview({
          credits_balance: 0,
          subscription_status: '',
          plan: ''
        });
        return;
      }
      try {
        const response = await fetch(`/${locale}/api/user/getSubscriptionOverview`);
        const json = await response.json();
        setOverview(json || {});
      } catch (e) {
        setOverview({
          credits_balance: 0,
          subscription_status: '',
          plan: ''
        });
      }
    };
    fetchOverview();
  }, [userData?.user_id, locale]);

  const checkLocalAndLoading = (lang) => {
    setMobileMenuOpen(false);
    if (locale != lang) {
      setShowLoadingModal(true);
    }
  }

  const checkPageAndLoading = (toPage) => {
    setMobileMenuOpen(false);
    if (page != toPage) {
      setShowLoadingModal(true);
    }
  }
  useEffect(() => {
    setShowLoadingModal(false);
  }, [pathname, setShowLoadingModal]);

  return (
    <header className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-7xl rounded-2xl border border-white/50 bg-white/70 backdrop-blur-xl shadow-lg transition-all duration-300">
      <LoadingModal loadingText={commonText.loadingText} />
      <GeneratingModal generatingText={commonText.generateText} />
      <LoginModal
        loadingText={commonText.loadingText}
        redirectPath={pageResult}
        loginModalDesc={authText.loginModalDesc}
        loginModalButtonText={authText.loginModalButtonText}
      />
      <LogoutModal
        logoutModalDesc={authText.logoutModalDesc}
        confirmButtonText={authText.confirmButtonText}
        cancelButtonText={authText.cancelButtonText}
        redirectPath={pageResult}
      />
      <nav className="mx-auto flex items-center justify-between p-3 px-6 lg:px-8" aria-label="Global">
        <div className="flex items-center gap-2">
          <Link
            href={getLinkHref(locale, '')}
            className="-m-1.5 p-1.5 transition-transform hover:scale-105"
            onClick={() => checkLocalAndLoading(locale)}>
            <img
              className="h-9 w-auto"
              src="/website.svg?v=3"
              width={32}
              height={24}
              alt={process.env.NEXT_PUBLIC_DOMAIN_NAME}
            />
          </Link>
        </div>
        <div className="flex lg:hidden">
          <button
            type="button"
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-slate-700 hover:text-primary-600"
            onClick={() => setMobileMenuOpen(true)}
          >
            <span className="sr-only">Open main menu</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        <div className="hidden lg:flex lg:gap-x-8 items-center">
          <Link
             href={getLinkHref(locale, '')}
             onClick={() => checkPageAndLoading('')}
             className="text-base font-medium leading-6 text-slate-700 hover:text-primary-600 transition-colors flex items-center gap-2">
             <Squares2X2Icon className="w-5 h-5" />
             {menuText.tools}
           </Link>

          <Link
            href={getLinkHref(locale, 'features')}
            onClick={() => checkPageAndLoading('features')}
            className="text-base font-medium leading-6 text-slate-700 hover:text-primary-600 transition-colors flex items-center gap-2">
            <SparklesIcon className="w-5 h-5" />
            Features
          </Link>

          <Link
            href={getLinkHref(locale, 'pricing')}
            onClick={() => checkPageAndLoading('pricing')}
            className="text-base font-medium leading-6 text-slate-700 hover:text-primary-600 transition-colors flex items-center gap-2">
            <CurrencyDollarIcon className="w-5 h-5" />
            {menuText.pricing}
          </Link>
        </div>
        <div className="hidden lg:flex lg:items-center lg:gap-4">
          <Menu as="div" className="relative inline-block text-left z-30">
            <div>
              <Menu.Button
                className="inline-flex w-full justify-center gap-x-1.5 border border-white/50 bg-white/50 rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-white transition-all shadow-sm">
                <GlobeAltIcon className="w-5 h-5 text-slate-500" />{locale == 'default' ? 'EN' : locale.toUpperCase()}
                <ChevronDownIcon className="-mr-1 h-5 w-5 text-slate-500" aria-hidden="true" />
              </Menu.Button>
            </div>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items
                className="absolute right-0 z-30 mt-2 w-26 origin-top-right divide-y divide-gray-100 rounded-xl bg-white/80 backdrop-blur-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <div className="py-1 z-30">
                  {
                    languages.map((item) => {
                      let hrefValue = `/${item.lang}`;
                      if (page) {
                        hrefValue = `/${item.lang}/${page}`;
                      }
                      return (
                        <Menu.Item key={item.lang}>
                          <Link href={hrefValue} onClick={() => checkLocalAndLoading(item.lang)} className={"z-30"}>
                            <span
                              className={'text-slate-700 block px-4 py-2 text-sm hover:text-primary-600 hover:bg-primary-50 z-30 transition-colors'}
                            >
                              {item.language}
                            </span>
                          </Link>
                        </Menu.Item>
                      )
                    })
                  }
                </div>
              </Menu.Items>
            </Transition>
          </Menu>
          
          {process.env.NEXT_PUBLIC_CHECK_GOOGLE_LOGIN !== '0' && (
            isLoggedIn ? (
              <Menu as="div" className="relative inline-block text-left z-30">
                <Menu.Button className="inline-flex items-center rounded-full border border-white/50 bg-white/60 p-1 shadow-sm hover:bg-white transition-all">
                  {userData?.image ? (
                    <img className="h-8 w-8 rounded-full object-cover" src={userData.image} alt={userData?.name || 'user'} />
                  ) : (
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-700 text-xs font-semibold">
                      {(userData?.name || userData?.email || 'U').slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </Menu.Button>
                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="absolute right-0 mt-2 w-80 origin-top-right rounded-2xl bg-white/95 p-2 shadow-xl ring-1 ring-slate-200 focus:outline-none backdrop-blur-md">
                    <div className="rounded-xl px-3 py-3">
                      <div className="flex items-center gap-2 text-slate-700">
                        <EnvelopeIcon className="w-4 h-4 text-slate-500" />
                        <p className="text-sm font-medium truncate">{userData?.email || ''}</p>
                      </div>
                    </div>
                    <div className="my-1 h-px bg-slate-200" />
                    <div className="px-2 py-2 space-y-2">
                      <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                        <div className="flex items-center gap-2 text-slate-700">
                          <CurrencyDollarIcon className="w-4 h-4 text-amber-500" />
                          <span className="text-sm">Credits</span>
                        </div>
                        <span className="text-sm font-semibold text-slate-900">{Number(overview?.credits_balance || 0)}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                        <div className="flex items-center gap-2 text-slate-700">
                          <UserCircleIcon className="w-4 h-4 text-sky-500" />
                          <span className="text-sm">Subscription</span>
                        </div>
                        <span className="text-sm font-semibold text-slate-900">{overview?.subscription_status || 'free'}</span>
                      </div>
                    </div>
                    <div className="my-1 h-px bg-slate-200" />
                    <div className="px-2 py-2">
                      <Menu.Item>
                        <Link
                          href={getLinkHref(locale, 'pricing')}
                          onClick={() => checkPageAndLoading('pricing')}
                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-slate-700 hover:bg-primary-50 hover:text-primary-700"
                        >
                          <TagIcon className="w-4 h-4" />
                          <span className="text-sm font-medium">Pricing</span>
                        </Link>
                      </Menu.Item>
                      <Menu.Item>
                        <Link
                          href={getLinkHref(locale, 'my')}
                          onClick={() => checkPageAndLoading('my')}
                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-slate-700 hover:bg-primary-50 hover:text-primary-700"
                        >
                          <UserCircleIcon className="w-4 h-4" />
                          <span className="text-sm font-medium">Manage Subscribe</span>
                        </Link>
                      </Menu.Item>
                    </div>
                    <div className="my-1 h-px bg-slate-200" />
                    <div className="px-2 py-2">
                      <button
                        onClick={() => setShowLogoutModal(true)}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-red-600 hover:bg-red-50"
                      >
                        <ArrowLeftStartOnRectangleIcon className="w-4 h-4" />
                        <span className="text-sm font-medium">Sign Out</span>
                      </button>
                    </div>
                  </Menu.Items>
                </Transition>
              </Menu>
            ) : (
              <LoginButton
                buttonType={0}
                loginText={authText?.loginText || 'Login'}
                className={"border border-white/50 bg-white/50 rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white transition-all shadow-sm"}
              />
            )
          )}
        </div>
      </nav>
      <Dialog as="div" className="lg:hidden" open={mobileMenuOpen} onClose={setMobileMenuOpen}>
        <div className="fixed inset-0 z-[60]" />
        <Dialog.Panel
          className="fixed inset-y-0 right-0 z-[60] w-full overflow-y-auto bg-white/95 backdrop-blur-xl px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
          <div className="flex items-center justify-between">
            <div className="flex">
              <Link href={getLinkHref(locale, '')} className="-m-1.5 ml-0.5 p-1.5"
                onClick={() => checkLocalAndLoading(locale)}>
                <img
                  className="h-9 w-auto"
                  src="/website.svg?v=3"
                  width={32}
                  height={24}
                  alt={process.env.NEXT_PUBLIC_DOMAIN_NAME}
                />
              </Link>
            </div>
            <button
              type="button"
              className="-m-2.5 rounded-md p-2.5 text-slate-700 z-20"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="sr-only">Close menu</span>
              <XMarkIcon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-6 flow-root">
            <div className="divide-y divide-gray-500/10">
              <div className="space-y-2 py-6">
                 <Link
                   href={getLinkHref(locale, '')}
                   onClick={() => checkPageAndLoading('')}
                   className="-mx-3 rounded-lg px-3 py-2 text-base font-semibold leading-7 text-slate-900 hover:bg-primary-50 hover:text-primary-600 transition-colors flex items-center gap-2">
                   <Squares2X2Icon className="w-5 h-5" />
                   {menuText.tools}
                 </Link>
                 <Link
                   href={getLinkHref(locale, 'features')}
                   onClick={() => checkPageAndLoading('features')}
                   className="-mx-3 rounded-lg px-3 py-2 text-base font-semibold leading-7 text-slate-900 hover:bg-primary-50 hover:text-primary-600 transition-colors flex items-center gap-2">
                   <SparklesIcon className="w-5 h-5" />
                   Features
                 </Link>

                 <div className="border-t border-gray-100 my-2"></div>

                 <Link
                   href={getLinkHref(locale, 'pricing')}
                   onClick={() => checkPageAndLoading('pricing')}
                   className="-mx-3 rounded-lg px-3 py-2 text-base font-semibold leading-7 text-slate-900 hover:bg-primary-50 hover:text-primary-600 transition-colors flex items-center gap-2">
                   <CurrencyDollarIcon className="w-5 h-5" />
                   {menuText.pricing}
                 </Link>
                {process.env.NEXT_PUBLIC_CHECK_GOOGLE_LOGIN !== '0' && (
                  <div className="pt-4 mt-4 border-t border-gray-100">
                    <LoginButton
                      buttonType={isLoggedIn ? 1 : 0}
                      loginText={authText?.loginText || 'Login'}
                      className={isLoggedIn ? "justify-start" : "-mx-3 flex w-full justify-start rounded-lg px-3 py-2 text-base font-semibold leading-7 text-slate-900 hover:bg-primary-50 hover:text-primary-600 transition-colors"}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </Dialog.Panel>
      </Dialog>
    </header>
  )
}
