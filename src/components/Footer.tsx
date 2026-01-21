'use client'
import Link from "next/link";
import {getLinkHref} from "~/configs/buildLink";
import {useCommonContext} from "~/context/common-context";

export default function Footer({
                                 locale,
                                 page,
                               }) {
  const {
    userData,
    setShowLoadingModal,
    commonText,
    menuText,
  } = useCommonContext();

  const checkPageAndLoading = (toPage) => {
    if (page != toPage) {
      setShowLoadingModal(true);
    }
  }

  return (
    <footer aria-labelledby="footer-heading" className="background-footer">
      <div id="footer-heading" className="sr-only">
        Footer
      </div>
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          <div className="space-y-8">
            <Link
              href={getLinkHref(locale, '')}
            >
              <img
                className="h-7"
                src="/website.svg"
                alt={process.env.NEXT_PUBLIC_DOMAIN_NAME}
              />
            </Link>
            <p className="text-sm leading-6 text-gray-600">
              {commonText.footerDescText}
            </p>
          </div>
          <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold leading-6 text-gray-900">{menuText.header0}</h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li>
                    <Link href={getLinkHref(locale, 'remove-shadow')} onClick={() => checkPageAndLoading('remove-shadow')} className="text-sm leading-6 text-gray-600 hover:text-gray-900">
                      {menuText.header1}
                    </Link>
                  </li>
                  <li>
                    <Link href={getLinkHref(locale, 'remove-emoji')} onClick={() => checkPageAndLoading('remove-emoji')} className="text-sm leading-6 text-gray-600 hover:text-gray-900">
                      {menuText.header2}
                    </Link>
                  </li>
                  <li>
                    <Link href={getLinkHref(locale, 'remove-color')} onClick={() => checkPageAndLoading('remove-color')} className="text-sm leading-6 text-gray-600 hover:text-gray-900">
                      {menuText.header3}
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-semibold leading-6 text-gray-900">{menuText.footerLegal}</h3>
                <ul role="list" className="mt-6 space-y-4">
                   <li>
                    <Link href={getLinkHref(locale, 'privacy-policy')} onClick={() => checkPageAndLoading('privacy-policy')} className="text-sm leading-6 text-gray-600 hover:text-gray-900">
                      {menuText.footerLegal0}
                    </Link>
                  </li>
                  <li>
                    <Link href={getLinkHref(locale, 'terms-of-service')} onClick={() => checkPageAndLoading('terms-of-service')} className="text-sm leading-6 text-gray-600 hover:text-gray-900">
                      {menuText.footerLegal1}
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
