import PageComponent from "./PageComponent";
import { setRequestLocale } from 'next-intl/server';

import {
  getTermsOfServiceText
} from "~/i18n/languageText";

export default async function IndexPage({ params: { locale = '' } }) {
  // Enable static rendering
  setRequestLocale(locale);

  const termsOfServiceText = await getTermsOfServiceText();


  return (
    <PageComponent
      locale={locale}
      termsOfServiceText={termsOfServiceText}
    />
  )


}
