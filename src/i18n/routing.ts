import { defineRouting } from "next-intl/routing";
import { locales } from "./config";

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: locales,
  // Used when no locale matches
  defaultLocale: "en",
  // Use the default: `always`，设置为 as-needed可不显示默认路由
  localePrefix: "as-needed",
  localeDetection: false,
  alternateLinks: false,
});
