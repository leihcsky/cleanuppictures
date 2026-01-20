import PageComponent from "./PageComponent";
import { setRequestLocale } from 'next-intl/server';

import {
  getDetailText,
} from "~/i18n/languageText";
import { getSimilarList, getWorkDetailByUid } from "~/servers/works";
import { notFound } from "next/navigation";

// export const revalidate = 86400;
export const dynamicParams = true
export const dynamic = 'error';

export default async function IndexPage({ params: { locale = '', uid = '' } }) {
  // Enable static rendering
  setRequestLocale(locale);

  const workDetail = await getWorkDetailByUid(locale, uid);
  if (workDetail.status == 404) {
    notFound();
  }
  const detailText = await getDetailText(workDetail);

  const similarList = await getSimilarList(workDetail.revised_text, uid, locale)

  return (
    <PageComponent
      locale={locale}
      detailText={detailText}
      workDetail={workDetail}
      similarList={similarList}
    />
  )


}
