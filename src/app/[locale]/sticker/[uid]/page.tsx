import PageComponent from "./PageComponent";
import { getSimilarList, getWorkDetailByUid } from "~/servers/works";
import { notFound } from "next/navigation";

// export const revalidate = 86400;
export const dynamicParams = true
export const dynamic = 'error';

export default async function IndexPage({ params: { locale = '', uid = '' } }) {
  // Enable static rendering
  const { setRequestLocale } = await import('next-intl/server');
  setRequestLocale(locale);
  const languageModule = await import('~/i18n/languageText');

  const workDetail = await getWorkDetailByUid(locale, uid);
  if (workDetail.status == 404) {
    notFound();
  }
  const detailText = await languageModule.getDetailText(workDetail);

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
