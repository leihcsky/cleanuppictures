import PageComponent from "./PageComponent";
import { setRequestLocale } from 'next-intl/server';

export default async function IndexPage({ params: { locale = '' } }) {
  // Enable static rendering
  setRequestLocale(locale);

  return (
    <PageComponent
      locale={locale}
    />
  )


}
