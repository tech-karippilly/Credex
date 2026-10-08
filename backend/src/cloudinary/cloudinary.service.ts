import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { UploadApiResponse } from 'cloudinary';

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
}

export interface CloudinaryUploadOptions {
  folder?: string;
  publicId?: string;
}

@Injectable()
export class CloudinaryService implements OnModuleInit {
  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    cloudinary.config({
      cloud_name: this.configService.getOrThrow<string>('cloudinary.cloudName'),
      api_key: this.configService.getOrThrow<string>('cloudinary.apiKey'),
      api_secret: this.configService.getOrThrow<string>('cloudinary.apiSecret'),
      secure: true,
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    options?: CloudinaryUploadOptions,
  ): Promise<CloudinaryUploadResult> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: options?.folder,
          public_id: options?.publicId,
          overwrite: options?.publicId ? true : undefined,
          resource_type: 'auto',
        },
        (error, result: UploadApiResponse | undefined) => {
          if (error || !result) {
            reject(error ?? new Error('Cloudinary upload failed'));
            return;
          }

          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  async deleteAsset(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }
}
