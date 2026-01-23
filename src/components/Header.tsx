'use client'
import { useState } from 'react'
import { Dialog } from '@headlessui/react'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import { GlobeAltIcon } from '@heroicons/react/24/outline'
import { Fragment } from 'react'
import { Menu, Transition } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/20/solid'
import Link from "next/link";
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
    userData,
    commonText,
    authText,
    menuText
  } = useCommonContext();

  const [pageResult] = useState(getLinkHref(locale, page))

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

  return (
    <header className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-7xl rounded-full border border-slate-300 bg-slate-50/90 backdrop-blur-md shadow-md transition-all duration-300">
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
      <nav className="mx-auto flex items-center justify-between p-4 px-6 lg:px-8" aria-label="Global">
        <div className="flex">
          <Link
            href={getLinkHref(locale, '')}
            className="-m-1.5 ml-0.5 p-1.5"
            onClick={() => checkLocalAndLoading(locale)}>
            <img
              className="h-8 w-auto"
              src="/website.svg"
              width={32}
              height={24}
              alt={process.env.NEXT_PUBLIC_DOMAIN_NAME}
            />
          </Link>
        </div>
        <div className="flex lg:hidden">
          <button
            type="button"
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700"
            onClick={() => setMobileMenuOpen(true)}
          >
            <span className="sr-only">Open main menu</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        <div className="hidden lg:ml-14 lg:flex lg:flex-1 lg:gap-x-6">
          <Link
             href={getLinkHref(locale, 'remove-color')}
             onClick={() => checkPageAndLoading('remove-color')}
             className="text-sm font-semibold leading-6 text-gray-900 hover:text-[#0071e3]">
             {menuText.header3}
           </Link>
          <Link
            href={getLinkHref(locale, 'remove-shadow')}
            onClick={() => checkPageAndLoading('remove-shadow')}
            className="text-sm font-semibold leading-6 text-gray-900 hover:text-[#0071e3]">
            {menuText.header1}
          </Link>
          <Link
            href={getLinkHref(locale, 'remove-emoji')}
            onClick={() => checkPageAndLoading('remove-emoji')}
            className="text-sm font-semibold leading-6 text-gray-900 hover:text-[#0071e3]">
            {menuText.header2}
          </Link>
        </div>
        <Menu as="div" className="hidden lg:relative lg:inline-block lg:text-left z-30">
          <div>
            <Menu.Button
              className="inline-flex w-full justify-center gap-x-1.5 border border-gray-300 rounded-full px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50">
              <GlobeAltIcon className="w-5 h-5 text-gray-500" />{locale == 'default' ? 'EN' : locale.toUpperCase()}
              <ChevronDownIcon className="-mr-1 h-5 w-5 text-gray-500" aria-hidden="true" />
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
              className="absolute right-0 z-30 mt-2 w-26 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
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
                            className={'text-gray-700 block px-4 py-2 text-sm hover:text-[#0071e3] z-30'}
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
      </nav>
      <Dialog as="div" className="lg:hidden" open={mobileMenuOpen} onClose={setMobileMenuOpen}>
        <div className="fixed inset-0 z-[60]" />
        <Dialog.Panel
          className="fixed inset-y-0 right-0 z-[60] w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
          <div className="flex items-center justify-between">
            <div className="flex">
              <Link href={getLinkHref(locale, '')} className="-m-1.5 ml-0.5 p-1.5"
                onClick={() => checkLocalAndLoading(locale)}>
                <img
                  className="h-8 w-auto"
                  src="/website.svg"
                  width={32}
                  height={24}
                  alt={process.env.NEXT_PUBLIC_DOMAIN_NAME}
                />
              </Link>
            </div>
            <button
              type="button"
              className="-m-2.5 rounded-md p-2.5 text-gray-700 z-20"
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
                   href={getLinkHref(locale, 'remove-color')}
                   onClick={() => checkPageAndLoading('remove-color')}
                   className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50">
                   {menuText.header3}
                 </Link>
                <Link
                  href={getLinkHref(locale, 'remove-shadow')}
                  onClick={() => checkPageAndLoading('remove-shadow')}
                  className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50">
                  {menuText.header1}
                </Link>
                <Link
                  href={getLinkHref(locale, 'remove-emoji')}
                  onClick={() => checkPageAndLoading('remove-emoji')}
                  className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50">
                  {menuText.header2}
                </Link>
              </div>
            </div>
          </div>
        </Dialog.Panel>
      </Dialog>
    </header>
  )
}
