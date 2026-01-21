import ToolPageComponent from "~/components/ToolPageComponent";

export async function generateMetadata({ params: { locale } }) {
  const languageModule = await import('~/i18n/languageText');
  const pageText = await languageModule.getRemoveShadowPageText();
  return {
    title: pageText.title,
    description: pageText.description,
  }
}

export default async function RemoveShadowPage({ params: { locale } }) {
  const languageModule = await import('~/i18n/languageText');
  const pageText = await languageModule.getRemoveShadowPageText();
  const toolText = await languageModule.getToolPageText();

  return (
    <ToolPageComponent
      locale={locale}
      pageName="remove-shadow"
      pageText={pageText}
      toolText={toolText}
    />
  )
}
