import PageComponent from "./PageComponent";
import { setRequestLocale } from 'next-intl/server';

import {
  getWorksText
} from "~/i18n/languageText";

export default async function IndexPage({ params: { locale = '' } }) {
  // Enable static rendering
  setRequestLocale(locale);

  const worksText = await getWorksText();

  return (
    <PageComponent
      locale={locale}
      worksText={worksText}
    />
  )


}
