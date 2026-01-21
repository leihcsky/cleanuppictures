import PageComponent from "./PageComponent";

export default async function IndexPage({ params: { locale = '' } }) {
  // Enable static rendering
  const { setRequestLocale } = await import('next-intl/server');
  setRequestLocale(locale);

  const languageModule = await import('~/i18n/languageText');

  const worksText = await languageModule.getWorksText();

  return (
    <PageComponent
      locale={locale}
      worksText={worksText}
    />
  )


}
