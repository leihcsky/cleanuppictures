import clsx from 'clsx';
import { Inter } from 'next/font/google';
import { notFound } from 'next/navigation';
import { ReactNode } from 'react';
import { locales } from '~/i18n/config';
import { CommonProvider } from '~/context/common-context';
import { NextAuthProvider } from '~/context/next-auth-context';

const inter = Inter({ subsets: ['latin'] });

type Props = {
  children: ReactNode;
  params: { locale: string };
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params: { locale }
}: Props) {

  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) notFound();

  // Enable static rendering
  const { setRequestLocale } = await import('next-intl/server');
  setRequestLocale(locale);

  const languageModule = await import('~/i18n/languageText');
  const commonText = await languageModule.getCommonText();
  const authText = await languageModule.getAuthText();
  const menuText = await languageModule.getMenuText();
  const pricingText = await languageModule.getPricingText();

  return (
    <html lang={locale}>
      <head>
        <script src="https://accounts.google.com/gsi/client" async defer></script>
      </head>
      <body suppressHydrationWarning={true} className={clsx(inter.className, 'flex flex-col background-div')}>
        <NextAuthProvider>
          <CommonProvider
            commonText={commonText}
            authText={authText}
            menuText={menuText}
            pricingText={pricingText}
          >
            {children}
          </CommonProvider>
        </NextAuthProvider>
      </body>
    </html>
  );
}
