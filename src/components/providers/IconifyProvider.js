"use client";

import { addCollection } from "@iconify/react";
import solarIcons from "@iconify-json/solar/icons.json";
import riIcons from "@iconify-json/ri/icons.json";

// Pre-register both icon sets so @iconify/react finds them locally
// without making any CDN requests. This keeps the strict connect-src CSP intact.
addCollection(solarIcons);
addCollection(riIcons);

export default function IconifyProvider({ children }) {
  return <>{children}</>;
}
