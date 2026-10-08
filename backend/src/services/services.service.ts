import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServiceResponse } from './interfaces/service-response.interface';
import { Service, ServiceDocument } from './schemas/service.schema';

const SERVICE_IMAGE_FOLDER = 'credex/services';

@Injectable()
export class ServicesService {
  private readonly logger = new Logger(ServicesService.name);

  constructor(
    @InjectModel(Service.name)
    private readonly serviceModel: Model<ServiceDocument>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  toResponse(service: ServiceDocument | Service): ServiceResponse {
    const document = service as ServiceDocument;
    const id = document._id ? document._id.toString() : '';

    return {
      id,
      title: document.title,
      description: document.description,
      icon: document.icon,
      image: document.image
        ? {
            url: document.image.url,
            publicId: document.image.publicId,
          }
        : null,
      order: document.order,
    };
  }

  async findAll(): Promise<ServiceResponse[]> {
    const services = await this.serviceModel
      .find()
      .sort({ order: 1, createdAt: 1, _id: 1 })
      .exec();

    return services.map((service) => this.toResponse(service));
  }

  async findOne(id: string): Promise<ServiceResponse> {
    const service = await this.findDocumentById(id);
    return this.toResponse(service);
  }

  async create(createServiceDto: CreateServiceDto): Promise<ServiceResponse> {
    const created = await this.serviceModel.create({
      title: createServiceDto.title,
      description: createServiceDto.description,
      icon: createServiceDto.icon,
      order: createServiceDto.order,
      image: null,
    });

    return this.toResponse(created);
  }

  async update(
    id: string,
    updateServiceDto: UpdateServiceDto,
  ): Promise<ServiceResponse> {
    await this.findDocumentById(id);

    const update: Partial<Service> = {};

    if (updateServiceDto.title !== undefined) {
      update.title = updateServiceDto.title;
    }
    if (updateServiceDto.description !== undefined) {
      update.description = updateServiceDto.description;
    }
    if (updateServiceDto.icon !== undefined) {
      update.icon = updateServiceDto.icon;
    }
    if (updateServiceDto.order !== undefined) {
      update.order = updateServiceDto.order;
    }

    const updated = await this.serviceModel
      .findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .exec();

    if (!updated) {
      throw new NotFoundException('Service not found');
    }

    return this.toResponse(updated);
  }

  async remove(id: string): Promise<void> {
    const service = await this.findDocumentById(id);

    if (service.image?.publicId) {
      await this.safeDeleteCloudinaryAsset(service.image.publicId);
    }

    await this.serviceModel.findByIdAndDelete(id).exec();
  }

  async uploadImage(
    id: string,
    file: Express.Multer.File,
  ): Promise<ServiceResponse> {
    await this.findDocumentById(id);

    const publicId = `${SERVICE_IMAGE_FOLDER}/${id}`;
    const previous = await this.serviceModel.findById(id).exec();
    const previousPublicId = previous?.image?.publicId;

    let uploaded: { url: string; publicId: string };
    try {
      uploaded = await this.cloudinaryService.uploadImage(file, {
        publicId,
      });
    } catch (error) {
      this.logger.error(
        `Failed to upload service image for ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new InternalServerErrorException('Failed to upload service image');
    }

    const updated = await this.serviceModel
      .findByIdAndUpdate(
        id,
        {
          image: {
            url: uploaded.url,
            publicId: uploaded.publicId,
          },
        },
        { new: true, runValidators: true },
      )
      .exec();

    if (!updated) {
      await this.safeDeleteCloudinaryAsset(uploaded.publicId);
      throw new NotFoundException('Service not found');
    }

    if (previousPublicId && previousPublicId !== uploaded.publicId) {
      await this.safeDeleteCloudinaryAsset(previousPublicId);
    }

    return this.toResponse(updated);
  }

  async removeImage(id: string): Promise<ServiceResponse> {
    const service = await this.findDocumentById(id);

    if (service.image?.publicId) {
      await this.safeDeleteCloudinaryAsset(service.image.publicId);
    }

    service.image = null;
    await service.save();

    return this.toResponse(service);
  }

  private async findDocumentById(id: string): Promise<ServiceDocument> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException('Service not found');
    }

    const service = await this.serviceModel.findById(id).exec();
    if (!service) {
      throw new NotFoundException('Service not found');
    }

    return service;
  }

  private async safeDeleteCloudinaryAsset(publicId: string): Promise<void> {
    try {
      await this.cloudinaryService.deleteAsset(publicId);
    } catch (error) {
      this.logger.warn(
        `Failed to delete Cloudinary asset ${publicId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
