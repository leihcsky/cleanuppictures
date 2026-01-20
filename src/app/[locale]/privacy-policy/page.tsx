import PageComponent from "./PageComponent";
import { setRequestLocale } from 'next-intl/server';

import {
  getPrivacyPolicyText
} from "~/i18n/languageText";

export default async function IndexPage({ params: { locale = '' } }) {
  // Enable static rendering
  setRequestLocale(locale);

  const privacyPolicyText = await getPrivacyPolicyText();


  return (
    <PageComponent
      locale={locale}
      privacyPolicyText={privacyPolicyText}
    />
  )


}
