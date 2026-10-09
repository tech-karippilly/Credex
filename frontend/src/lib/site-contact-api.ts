import { apiRequest } from "./api";
import type { SiteContact, SiteContactImage } from "./api-types";

export const siteContactApi = {
  get(): Promise<SiteContact> {
    return apiRequest<SiteContact>("/site-contact");
  },

  update(payload: SiteContact): Promise<SiteContact> {
    return apiRequest<SiteContact>("/site-contact", {
      method: "PUT",
      auth: true,
      json: payload,
    });
  },

  uploadImage(file: File): Promise<SiteContactImage> {
    const formData = new FormData();
    formData.append("image", file);
    return apiRequest<SiteContactImage>("/site-contact/images", {
      method: "POST",
      auth: true,
      formData,
    });
  },
};
