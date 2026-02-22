import {getTranslations} from "next-intl/server";

export const getIndexPageText = async () => {
  const tIndex = await getTranslations('IndexPageText');
  const brand = process.env.NEXT_PUBLIC_WEBSITE_NAME || '';
  return {
    title: tIndex('title').replace(/%brand%/g, brand),
    description: tIndex('description').replace(/%brand%/g, brand),
    h1Text: tIndex('h1Text'),
    descriptionBelowH1Text: tIndex('descriptionBelowH1Text'),
    startCleaning: tIndex('startCleaning'),
    toolsTitle: tIndex('toolsTitle'),
    toolShadowTitle: tIndex('toolShadowTitle'),
    toolShadowDesc: tIndex('toolShadowDesc'),
    toolEmojiTitle: tIndex('toolEmojiTitle'),
    toolEmojiDesc: tIndex('toolEmojiDesc'),
    toolColorTitle: tIndex('toolColorTitle'),
    toolColorDesc: tIndex('toolColorDesc'),
    positioningTitle: tIndex('positioningTitle'),
    positioningDesc: tIndex('positioningDesc'),
    usersTitle: tIndex('usersTitle'),
    user1: tIndex('user1'),
    user2: tIndex('user2'),
    user3: tIndex('user3'),
    user4: tIndex('user4'),
    user5: tIndex('user5'),
    introTitle: tIndex('introTitle'),
    intro1: tIndex('intro1'),
    intro2: tIndex('intro2'),
    intro3: tIndex('intro3'),
    removeWhatTitle: tIndex('removeWhatTitle'),
    removeWhatDesc: tIndex('removeWhatDesc'),
    whyTitle: tIndex('whyTitle').replace(/%brand%/g, brand),
    why1Title: tIndex('why1Title'),
    why1Desc: tIndex('why1Desc'),
    why2Title: tIndex('why2Title'),
    why2Desc: tIndex('why2Desc'),
    why3Title: tIndex('why3Title'),
    why3Desc: tIndex('why3Desc'),
    faqTitle: tIndex('faqTitle'),
    faqSubtitle: tIndex('faqSubtitle'),
    faq1Question: tIndex('faq1Question'),
    faq1Answer: tIndex('faq1Answer'),
    faq2Question: tIndex('faq2Question'),
    faq2Answer: tIndex('faq2Answer').replace(/%brand%/g, brand),
    faq3Question: tIndex('faq3Question'),
    faq3Answer: tIndex('faq3Answer'),
    faq4Question: tIndex('faq4Question'),
    faq4Answer: tIndex('faq4Answer'),
    faq5Question: tIndex('faq5Question'),
    faq5Answer: tIndex('faq5Answer'),
    faq6Question: tIndex('faq6Question'),
    faq6Answer: tIndex('faq6Answer'),
    faq7Question: tIndex('faq7Question'),
    faq7Answer: tIndex('faq7Answer'),
    howTitleHome: tIndex('howTitleHome'),
  }
}

export const getToolPageText = async () => {
  const tTool = await getTranslations('ToolPageText');
  return {
    uploadTitle: tTool('uploadTitle'),
    uploadDesc: tTool('uploadDesc'),
    download: tTool('download'),
    original: tTool('original'),
    processed: tTool('processed'),
    processButton: tTool('processButton'),
    stepTitle: tTool('stepTitle'),
    step1: tTool('step1'),
    step1Sub: tTool('step1Sub'),
    step2: tTool('step2'),
    step2Sub: tTool('step2Sub'),
    step3: tTool('step3'),
    step3Sub: tTool('step3Sub'),
    aboutTitle: tTool('aboutTitle'),
    faqTitle: tTool('faqTitle'),
    tolTip: tTool('tolTip'),
    refineTip: tTool('refineTip'),
    autoRefineTip: tTool('autoRefineTip'),
  }
}

export const getRemoveShadowPageText = async () => {
  const tPage = await getTranslations('RemoveShadowPage');
  return {
    title: tPage('title'),
    h1: tPage('h1'),
    description: tPage('description'),
    aboutDesc: tPage('aboutDesc'),
    howTitle: tPage('howTitle'),
    how1: tPage('how1'),
    how2: tPage('how2'),
    how3: tPage('how3'),
    whatTitle: tPage('whatTitle'),
    what1: tPage('what1'),
    what2: tPage('what2'),
    what3: tPage('what3'),
    what4: tPage('what4'),
    useTitle: tPage('useTitle'),
    use1: tPage('use1'),
    use2: tPage('use2'),
    use3: tPage('use3'),
    use4: tPage('use4'),
    formatsTitle: tPage('formatsTitle'),
    format1: tPage('format1'),
    format2: tPage('format2'),
    format3: tPage('format3'),
    faq1Q: tPage('faq1Q'),
    faq1A: tPage('faq1A'),
    faq2Q: tPage('faq2Q'),
    faq2A: tPage('faq2A'),
    faq3Q: tPage('faq3Q'),
    faq3A: tPage('faq3A'),
    faq4Q: tPage('faq4Q'),
    faq4A: tPage('faq4A'),
  }
}

export const getRemoveEmojiPageText = async () => {
  const tPage = await getTranslations('RemoveEmojiPage');
  return {
    title: tPage('title'),
    h1: tPage('h1'),
    description: tPage('description'),
    aboutDesc: tPage('aboutDesc'),
    faq1Q: tPage('faq1Q'),
    faq1A: tPage('faq1A'),
  }
}

export const getRemoveColorPageText = async () => {
  const tPage = await getTranslations('RemoveColorPage');
  return {
    title: tPage('title'),
    h1: tPage('h1'),
    description: tPage('description'),
    aboutDesc: tPage('aboutDesc'),
    faq1Q: tPage('faq1Q'),
    faq1A: tPage('faq1A'),
    faq2Q: tPage('faq2Q'),
    faq2A: tPage('faq2A'),
    faq3Q: tPage('faq3Q'),
    faq3A: tPage('faq3A'),
    faq4Q: tPage('faq4Q'),
    faq4A: tPage('faq4A'),
    howTitle: tPage('howTitle'),
    how1: tPage('how1'),
    how2: tPage('how2'),
    how3: tPage('how3'),
    how4: tPage('how4'),
    how5: tPage('how5'),
    how6: tPage('how6'),
  }
}

export const getCommonText = async () => {
  const tCommon = await getTranslations('CommonText');
  return {
    loadingText: tCommon('loadingText'),
    generateText: tCommon('generateText'),
    placeholderText: tCommon('placeholderText'),
    buttonText: tCommon('buttonText'),
    footerDescText: tCommon('footerDescText'),
    timesLeft: tCommon('timesLeft'),
    timesRight: tCommon('timesRight'),
    download: tCommon('download'),
    result: tCommon('result'),
    moreWorks: tCommon('moreWorks'),
    generateNew: tCommon('generateNew'),
    displayPublic: tCommon('displayPublic'),
    similarText: tCommon('similarText'),
    prompt: tCommon('prompt'),
    revised: tCommon('revised'),
    exploreMore: tCommon('exploreMore'),
    keyword: tCommon('keyword'),
    searchButtonText: tCommon('searchButtonText'),
  }
}

export const getAuthText = async () => {
  const tAuth = await getTranslations('AuthText');
  return {
    loginText: tAuth('loginText'),
    loginModalDesc: tAuth('loginModalDesc'),
    loginModalButtonText: tAuth('loginModalButtonText'),
    logoutModalDesc: tAuth('logoutModalDesc'),
    confirmButtonText: tAuth('confirmButtonText'),
    cancelButtonText: tAuth('cancelButtonText'),
  }
}


export const getPricingText = async () => {
  const tPricing = await getTranslations('PricingText');
  const title = tPricing('title') + ' | ' + process.env.NEXT_PUBLIC_WEBSITE_NAME;
  const description = tPricing('description');
  const h1Text =  tPricing('h1Text');
  const basic =  tPricing('basic');
  const essential =  tPricing('essential');
  const growth =  tPricing('growth');
  const buyText=  tPricing('buyText');
  const popularText = tPricing('popularText');
  const creditsText = tPricing('creditsText');
  const creditText = tPricing('creditText');
  const free = tPricing('free');
  const free0 = tPricing('free0');
  const freeText = tPricing('freeText');
  let freeIntro0 = tPricing('freeIntro0');
  const freeIntro1 = tPricing('freeIntro1');
  const freeIntro2 = tPricing('freeIntro2');
  const subscriptionIntro0 = tPricing('subscriptionIntro0');
  const subscriptionIntro1 = tPricing('subscriptionIntro1');
  const subscriptionIntro2 = tPricing('subscriptionIntro2');
  const subscriptionIntro3 = tPricing('subscriptionIntro3');
  const subscriptionIntro4 = tPricing('subscriptionIntro4');
  const monthText = tPricing('monthText');
  const monthlyText = tPricing('monthlyText');
  const annualText = tPricing('annualText');
  const annuallyText = tPricing('annuallyText');
  const annuallySaveText = tPricing('annuallySaveText');

  // 免费生成次数
  const freeTimes = process.env.FREE_TIMES;
  freeIntro0 = freeIntro0.replace(/%freeTimes%/g, freeTimes);

  return {
    title: title,
    description: description,
    h1Text: h1Text,
    basic: basic,
    essential: essential,
    growth: growth,
    buyText: buyText,
    popularText: popularText,
    creditsText: creditsText,
    creditText: creditText,
    free: free,
    free0: free0,
    freeText: freeText,
    freeIntro0: freeIntro0,
    freeIntro1: freeIntro1,
    freeIntro2: freeIntro2,
    subscriptionIntro0: subscriptionIntro0,
    subscriptionIntro1: subscriptionIntro1,
    subscriptionIntro2: subscriptionIntro2,
    subscriptionIntro3: subscriptionIntro3,
    subscriptionIntro4: subscriptionIntro4,
    monthText: monthText,
    monthlyText: monthlyText,
    annualText: annualText,
    annuallyText: annuallyText,
    annuallySaveText: annuallySaveText,
  }
}

export const getPrivacyPolicyText = async () => {
  const tPrivacyPolicy = await getTranslations('PrivacyPolicyText');
  return {
    title: tPrivacyPolicy('title') + ' | ' + process.env.NEXT_PUBLIC_WEBSITE_NAME,
    description: tPrivacyPolicy('description'),
    h1Text: tPrivacyPolicy('h1Text'),
    detailText: tPrivacyPolicy('detailText'),
  }
}


export const getTermsOfServiceText = async () => {
  const tTermsOfService = await getTranslations('TermsOfServiceText');
  return {
    title: tTermsOfService('title') + ' | ' + process.env.NEXT_PUBLIC_WEBSITE_NAME,
    description: tTermsOfService('description'),
    h1Text: tTermsOfService('h1Text'),
    detailText: tTermsOfService('detailText'),
  }
}

export const getWorksText = async () => {
  const tWorks = await getTranslations('WorksText');
  return {
    title: tWorks('title') + ' | ' + process.env.NEXT_PUBLIC_WEBSITE_NAME,
    description: tWorks('description'),
    h1Text: tWorks('h1Text'),
    descriptionBelowH1Text: tWorks('descriptionBelowH1Text'),
    descText: tWorks('descText'),
    toContinue: tWorks('toContinue'),
  }
}

export const getExploreText = async (countSticker: string, page) => {
  const tExplore = await getTranslations('ExploreText');
  let title = tExplore('title');
  let description = tExplore('description');
  let h1Text = tExplore('h1Text');
  let descriptionBelowH1Text = tExplore('descriptionBelowH1Text');
  let pageText = tExplore('pageText');
  let h2Text = tExplore('h2Text');

  title = title.replace(/%countSticker%/g, countSticker);
  description = description.replace(/%countSticker%/g, countSticker);
  pageText = pageText.replace(/%pageNumber%/g, page);

  if (page != '1') {
    title = title + ", " + pageText + ' | ' + process.env.NEXT_PUBLIC_WEBSITE_NAME;
  } else {
    title = title + ' | ' + process.env.NEXT_PUBLIC_WEBSITE_NAME;
  }
  h2Text = h2Text.replace(/%countSticker%/g, countSticker);

  return {
    title: title,
    description: description,
    h1Text: h1Text,
    descriptionBelowH1Text: descriptionBelowH1Text,
    h2Text: h2Text
  }
}

export const getDetailText = async (workDetail) => {
  let promptResult = workDetail.input_text.slice(0, 20);
  const tDetail = await getTranslations('DetailText');
  let title = tDetail('title');
  let description = tDetail('description');
  let h1Text = tDetail('h1Text');
  let descriptionBelowH1Text = tDetail('descriptionBelowH1Text');
  let numberText = tDetail('numberText');
  let h2Text = tDetail('h2Text');

  title = title.replace(/%prompt%/g, promptResult);
  description = description.replace(/%prompt%/g, promptResult);
  h1Text = h1Text.replace(/%prompt%/g, promptResult);
  descriptionBelowH1Text = descriptionBelowH1Text.replace(/%prompt%/g, promptResult);

  numberText = numberText.replace(/%detailId%/g, workDetail.id);
  title = title + ', ' + numberText + ' | ' + process.env.NEXT_PUBLIC_WEBSITE_NAME;

  h2Text = h2Text.replace(/%prompt%/g, promptResult);

  return {
    title: title,
    description: description,
    h1Text: h1Text,
    descriptionBelowH1Text: descriptionBelowH1Text,
    h2Text: h2Text
  }
}

export const getQuestionText = async () => {
  const tQuestion = await getTranslations('QuestionText');
  return {
    detailText: tQuestion('detailText')
  }
}

export const getMenuText = async () => {
  const tMenu = await getTranslations('MenuText');
  return {
    header0: tMenu('header0'),
    header1: tMenu('header1'),
    header2: tMenu('header2'),
    header3: tMenu('header3'),
    footerLegal: tMenu('footerLegal'),
    footerLegal0: tMenu('footerLegal0'),
    footerLegal1: tMenu('footerLegal1'),
    footerSupport: tMenu('footerSupport'),
    footerSupport0: tMenu('footerSupport0'),
    footerSupport1: tMenu('footerSupport1'),
  }
}

export const getSearchText = async (countSticker, sticker: string, countStickerAll) => {
  const tSearch = await getTranslations('SearchText');
  let title = tSearch('title');
  let description = tSearch('description');
  let h1Text = tSearch('h1Text');
  let h2Text = tSearch('h2Text');
  let titleSearch = tSearch('titleSearch');
  let h2TextSearch = tSearch('h2TextSearch');

  title = title.replace(/%countSticker%/g, countSticker);
  description = description.replace(/%countStickerAll%/g, countStickerAll);
  h2Text = h2Text.replace(/%countSticker%/g, countSticker);

  title = title + ' | ' + process.env.NEXT_PUBLIC_WEBSITE_NAME;

  if (sticker) {
    titleSearch = titleSearch.replace(/%countSticker%/g, countSticker);
    let promptResult = sticker.slice(0, 20);
    titleSearch = titleSearch.replace(/%prompt%/g, promptResult);
    title = titleSearch + ' | ' + process.env.NEXT_PUBLIC_WEBSITE_NAME;

    h2TextSearch = h2TextSearch.replace(/%countSticker%/g, countSticker);
    h2TextSearch = h2TextSearch.replace(/%prompt%/g, promptResult);
    h2Text = h2TextSearch;
  }

  return {
    title: title,
    description: description,
    h1Text: h1Text,
    h2Text: h2Text,
  }

}
