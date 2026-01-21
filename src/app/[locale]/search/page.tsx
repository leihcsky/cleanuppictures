import PageComponent from "./PageComponent";
import { getLatestPublicResultList } from "~/servers/works";
import { getCountSticker } from "~/servers/keyValue";
import { searchByWords, addSearchLog } from "~/servers/search";

export const revalidate = 0;

export default async function SearchPage({ params: { locale = '' }, searchParams: { sticker = '' } }) {
  // Enable static rendering
  const { setRequestLocale } = await import('next-intl/server');
  setRequestLocale(locale);

  const languageModule = await import('~/i18n/languageText');


  const countSticker = await getCountSticker();

  let resultInfoListInit = [];
  let searchText;
  if (sticker) {
    resultInfoListInit = await searchByWords(locale, sticker);
    searchText = await languageModule.getSearchText(resultInfoListInit.length, sticker, countSticker);
    addSearchLog(sticker, resultInfoListInit.length);
  } else {
    resultInfoListInit = await getLatestPublicResultList(locale, 1);
    searchText = await languageModule.getSearchText(countSticker, sticker, countSticker);
  }

  return (
    <PageComponent
      locale={locale}
      searchText={searchText}
      resultInfoListInit={resultInfoListInit}
      sticker={sticker}
    />
  )
}
