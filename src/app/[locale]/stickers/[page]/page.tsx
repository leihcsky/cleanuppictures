import PageComponent from "./PageComponent";
import { getPagination, getPublicResultList } from "~/servers/works";
import { notFound } from "next/navigation";
import { getCountSticker } from "~/servers/keyValue";

export const revalidate = 300;
export const dynamic = "force-static";

export default async function IndexPage({ params: { locale = '', page = 2 } }) {
  // Enable static rendering
  const { setRequestLocale } = await import('next-intl/server');
  setRequestLocale(locale);
  const languageModule = await import('~/i18n/languageText');

  const countSticker = await getCountSticker();

  if (page == 0) {
    page = 1;
  }
  const exploreText = await languageModule.getExploreText(countSticker, page);

  const resultInfoData = await getPublicResultList(locale, page);
  const pageData = await getPagination(locale, page);

  if (page > pageData.totalPage) {
    notFound();
  }

  return (
    <PageComponent
      locale={locale}
      exploreText={exploreText}
      resultInfoData={resultInfoData}
      page={page}
      pageData={pageData}
    />
  )


}
