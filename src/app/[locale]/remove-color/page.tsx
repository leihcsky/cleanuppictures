import RemoveColorTool from "~/components/RemoveColorTool";
// Defer i18n imports to runtime to avoid issues during static path generation

export async function generateMetadata({ params: { locale } }) {
  const languageModule = await import('~/i18n/languageText');
  const pageText = await languageModule.getRemoveColorPageText();
  return {
    title: pageText.title,
    description: pageText.description,
  }
}

export default async function RemoveColorPage({ params: { locale } }) {
  const languageModule = await import('~/i18n/languageText');
  const pageText = await languageModule.getRemoveColorPageText();
  const toolText = await languageModule.getToolPageText();

  return (
    <RemoveColorTool
      locale={locale}
      pageName="remove-color"
      pageText={pageText}
      toolText={toolText}
    />
  )
}
