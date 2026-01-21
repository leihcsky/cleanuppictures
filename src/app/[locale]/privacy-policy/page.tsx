import { getPrivacyPolicyText } from "~/i18n/languageText";

export async function generateMetadata({ params: { locale } }) {
  const pageText = await getPrivacyPolicyText();
  return {
    title: pageText.title,
    description: pageText.description,
  }
}

export default async function PrivacyPolicyPage({ params: { locale } }) {
  const pageText = await getPrivacyPolicyText();

  return (
    <div className="bg-white px-6 py-32 lg:px-8">
      <div className="mx-auto max-w-3xl text-base leading-7 text-gray-700">
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">{pageText.h1Text}</h1>
        <div className="mt-10 max-w-2xl whitespace-pre-line">
          {pageText.detailText}
        </div>
      </div>
    </div>
  )
}
