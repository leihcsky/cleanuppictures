import PageComponent from "./PageComponent";
import { getPagination, getPublicResultList } from "~/servers/works";
import { getCountSticker } from "~/servers/keyValue";
import { notFound } from "next/navigation";

export const revalidate = 300;
function stickerFeatureEnabled() {
  const raw = String(process.env.ENABLE_STICKER_PAGES || process.env.NEXT_PUBLIC_ENABLE_STICKER_PAGES || "").toLowerCase();
  return raw === "1" || raw === "true";
}

export default async function IndexPage({ params: { locale = '' } }) {
  if (!stickerFeatureEnabled()) {
    notFound();
  }
  // Enable static rendering
  const { setRequestLocale } = await import('next-intl/server');
  setRequestLocale(locale);

  const languageModule = await import('~/i18n/languageText');

  let countSticker = '';
  try {
    countSticker = await getCountSticker();
  } catch (e) {
    console.error("Failed to fetch sticker count:", e);
  }

  const exploreText = await languageModule.getExploreText(countSticker || '0', 1);

  let resultInfoData = [];
  try {
    resultInfoData = await getPublicResultList(locale, 1);
  } catch (e) {
    console.error("Failed to fetch result list:", e);
  }

  let pageData = { totalPage: 0, pagination: [] };
  try {
    pageData = await getPagination(locale, 1);
  } catch (e) {
    console.error("Failed to fetch pagination:", e);
  }


  return (
    <PageComponent
      locale={locale}
      exploreText={exploreText}
      resultInfoData={resultInfoData}
      page={1}
      pageData={pageData}
    />
  )


}
