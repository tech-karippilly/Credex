import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { UpdateSiteContactDto } from './dto/update-site-contact.dto';
import {
  SiteContactResponse,
} from './interfaces/site-contact-response.interface';
import {
  SiteContact,
  SiteContactDocument,
} from './schemas/site-contact.schema';

const SITE_CONTACT_KEY = 'default';
const SITE_CONTACT_IMAGE_FOLDER = 'credex/site-contact';

@Injectable()
export class SiteContactService {
  private readonly logger = new Logger(SiteContactService.name);

  constructor(
    @InjectModel(SiteContact.name)
    private readonly siteContactModel: Model<SiteContactDocument>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  toResponse(document: SiteContactDocument | SiteContact): SiteContactResponse {
    return {
      contact: {
        email: document.contact?.email ?? '',
        phone: document.contact?.phone ?? '',
        location: document.contact?.location ?? '',
        linkedinUrl: document.contact?.linkedinUrl ?? '',
        instagramUrl: document.contact?.instagramUrl ?? '',
      },
      homepage: {
        mainHeadline: document.homepage?.mainHeadline ?? '',
        supportingText: document.homepage?.supportingText ?? '',
        homepageMainImage: document.homepage?.homepageMainImage
          ? {
              url: document.homepage.homepageMainImage.url,
              publicId: document.homepage.homepageMainImage.publicId,
            }
          : null,
        aboutSectionImage: document.homepage?.aboutSectionImage
          ? {
              url: document.homepage.aboutSectionImage.url,
              publicId: document.homepage.aboutSectionImage.publicId,
            }
          : null,
      },
    };
  }

  async getOrCreate(): Promise<SiteContactResponse> {
    let doc = await this.siteContactModel
      .findOne({ key: SITE_CONTACT_KEY })
      .exec();

    if (!doc) {
      doc = await this.siteContactModel.create({ key: SITE_CONTACT_KEY });
    }

    return this.toResponse(doc);
  }

  async update(updateDto: UpdateSiteContactDto): Promise<SiteContactResponse> {
    const doc = await this.siteContactModel
      .findOne({ key: SITE_CONTACT_KEY })
      .exec();

    const existing =
      doc ??
      (await this.siteContactModel.create({ key: SITE_CONTACT_KEY }));

    if (updateDto.contact) {
      existing.contact = {
        ...existing.contact,
        ...updateDto.contact,
      };
    }

    if (updateDto.homepage) {
      const homepage = { ...existing.homepage };

      if (updateDto.homepage.mainHeadline !== undefined) {
        homepage.mainHeadline = updateDto.homepage.mainHeadline;
      }
      if (updateDto.homepage.supportingText !== undefined) {
        homepage.supportingText = updateDto.homepage.supportingText;
      }
      if (updateDto.homepage.homepageMainImage !== undefined) {
        homepage.homepageMainImage = updateDto.homepage.homepageMainImage;
      }
      if (updateDto.homepage.aboutSectionImage !== undefined) {
        homepage.aboutSectionImage = updateDto.homepage.aboutSectionImage;
      }

      existing.homepage = homepage;
    }

    await existing.save();
    return this.toResponse(existing);
  }

  async uploadImage(
    file: Express.Multer.File,
  ): Promise<{ url: string; publicId: string }> {
    try {
      return await this.cloudinaryService.uploadImage(file, {
        folder: SITE_CONTACT_IMAGE_FOLDER,
      });
    } catch (error) {
      this.logger.error(
        `Failed to upload site contact image: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new InternalServerErrorException('Failed to upload image');
    }
  }
}
