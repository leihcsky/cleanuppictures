import PageComponent from "./PageComponent";
import { setRequestLocale } from 'next-intl/server';

import {
  getIndexPageText,
  getQuestionText
} from "~/i18n/languageText";
import { getLatestPublicResultList } from "~/servers/works";

export const revalidate = 120;
export default async function IndexPage({ params: { locale = '' }, searchParams: searchParams }) {
  // Enable static rendering
  setRequestLocale(locale);

  const indexText = await getIndexPageText();
  const questionText = await getQuestionText();

  const resultInfoListInit = await getLatestPublicResultList(locale, 1);

  return (
    <PageComponent
      locale={locale}
      indexText={indexText}
      questionText={questionText}
      resultInfoListInit={resultInfoListInit}
      searchParams={searchParams}
    />
  )


}
