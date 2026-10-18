import type { Career, Service, SiteContact } from "./api-types";
import type { JobRow, ServiceRow, SiteSettings } from "./content.functions";

export type SiteSettingsForm = SiteSettings & {
  hero_image_publicId: string;
  about_image_publicId: string;
};

export function siteContactToSettings(data: SiteContact): SiteSettingsForm {
  return {
    email: data.contact.email,
    phone: data.contact.phone,
    location: data.contact.location,
    linkedin: data.contact.linkedinUrl,
    instagram: data.contact.instagramUrl,
    hero_title: data.homepage.mainHeadline,
    hero_text: data.homepage.supportingText,
    hero_image: data.homepage.homepageMainImage?.url ?? "",
    about_image: data.homepage.aboutSectionImage?.url ?? "",
    hero_image_publicId: data.homepage.homepageMainImage?.publicId ?? "",
    about_image_publicId: data.homepage.aboutSectionImage?.publicId ?? "",
  };
}

export function settingsToSiteContact(form: SiteSettingsForm): SiteContact {
  const homepageMainImage =
    form.hero_image && form.hero_image_publicId
      ? { url: form.hero_image, publicId: form.hero_image_publicId }
      : null;
  const aboutSectionImage =
    form.about_image && form.about_image_publicId
      ? { url: form.about_image, publicId: form.about_image_publicId }
      : null;

  return {
    contact: {
      email: form.email,
      phone: form.phone,
      location: form.location,
      linkedinUrl: form.linkedin,
      instagramUrl: form.instagram,
    },
    homepage: {
      mainHeadline: form.hero_title,
      supportingText: form.hero_text,
      homepageMainImage,
      aboutSectionImage,
    },
  };
}

export function serviceToRow(service: Service): ServiceRow {
  const description = service.description ?? "";
  const storedShort = service.short?.trim() ?? "";
  const short =
    storedShort ||
    (description.length > 160 ? `${description.slice(0, 157).trimEnd()}…` : description);

  return {
    id: service.id,
    title: service.title,
    short,
    description,
    icon: service.icon ?? "Layers",
    image_url: service.image?.url ?? null,
    capabilities: service.capabilities ?? [],
    benefits: service.benefits ?? [],
    sort: service.order,
    published: service.isVisible !== false,
  };
}

export function careerToJobRow(career: Career): JobRow {
  return {
    id: career.id,
    title: career.title,
    location: career.location,
    employment: career.employmentType,
    experience: career.experience,
    workplace: career.workplace,
    salary: career.salary,
    responsibilities: career.responsibilities ?? [],
    requirements: career.requirements ?? [],
    good_to_have: (career.goodToHave ?? []).join("\n"),
    sort: career.order,
    published: career.isVisible ?? true,
  };
}
