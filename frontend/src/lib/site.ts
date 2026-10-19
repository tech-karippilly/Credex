export const SITE_URL = "https://credexfin.com";

const LOGO_CLOUDINARY_PATH = "v1791291156/logo.jpg";
const CLOUDINARY_IMAGE_BASE = "https://res.cloudinary.com/qqvouqfg/image/upload";

function cloudinaryLogo(size: number) {
  return `${CLOUDINARY_IMAGE_BASE}/c_fill,w_${size},h_${size},f_auto,q_auto/${LOGO_CLOUDINARY_PATH}`;
}

/** Full-size logo used in the header, footer, and print layouts. */
export const LOGO_URL = `${CLOUDINARY_IMAGE_BASE}/${LOGO_CLOUDINARY_PATH}`;

/** Browser tab and bookmark icons (brand logo, not generic placeholders). */
export const FAVICON_URL = cloudinaryLogo(32);
export const APPLE_TOUCH_ICON_URL = cloudinaryLogo(180);

/** Social / Open Graph preview image. */
export const OG_IMAGE_URL = cloudinaryLogo(512);

export const siteIconLinks = [
  { rel: "icon", href: FAVICON_URL, type: "image/jpeg", sizes: "32x32" },
  { rel: "apple-touch-icon", href: APPLE_TOUCH_ICON_URL, sizes: "180x180" },
] as const;

export const company = {
  legalName: "CREDEX",
  brand: "CREDEX",
  tagline: "The next-generation lending OS for India's NBFCs & MFIs.",
  website: "credexfin.com",
  cin: "U62099KL2026PTC106127",
  location: "Irinjalakuda, Thrissur, Kerala, India",
};

export const nav = [
  { to: "/", label: "Home" },
  { to: "/services", label: "Platform" },
  { to: "/solutions", label: "Modules" },
  { to: "/about", label: "Company" },
  { to: "/careers", label: "Careers" },
  { to: "/contact", label: "Contact" },
] as const;

