import PageComponent from "./PageComponent";
// Server-only imports moved into function scope

export const revalidate = 120;
export default async function IndexPage({ params: { locale = '' }, searchParams: searchParams }) {
  // Enable static rendering
  const { setRequestLocale } = await import('next-intl/server');
  setRequestLocale(locale);

  const languageModule = await import('~/i18n/languageText');
  const indexText = await languageModule.getIndexPageText();

  return (
    <PageComponent
      locale={locale}
      indexText={indexText}
    />
  )
}
