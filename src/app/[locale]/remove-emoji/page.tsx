import ToolPageComponent from "~/components/ToolPageComponent";

export async function generateMetadata({ params: { locale } }) {
  const languageModule = await import('~/i18n/languageText');
  const pageText = await languageModule.getRemoveEmojiPageText();
  return {
    title: pageText.title,
    description: pageText.description,
  }
}

export default async function RemoveEmojiPage({ params: { locale } }) {
  const languageModule = await import('~/i18n/languageText');
  const pageText = await languageModule.getRemoveEmojiPageText();
  const toolText = await languageModule.getToolPageText();

  return (
    <ToolPageComponent
      locale={locale}
      pageName="remove-emoji"
      pageText={pageText}
      toolText={toolText}
    />
  )
}
