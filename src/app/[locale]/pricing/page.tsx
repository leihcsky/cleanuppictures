import PageComponent from "./PageComponent";

export default async function IndexPage({ params: { locale = '' } }) {
  // Enable static rendering
  const { setRequestLocale } = await import('next-intl/server');
  setRequestLocale(locale);

  return (
    <PageComponent
      locale={locale}
    />
  )


}
