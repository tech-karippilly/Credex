import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { CreateEnquiryDto } from './dto/create-enquiry.dto';
import { EnquiryResponse } from './interfaces/enquiry-response.interface';
import { Enquiry, EnquiryDocument } from './schemas/enquiry.schema';

@Injectable()
export class EnquiriesService {
  constructor(
    @InjectModel(Enquiry.name)
    private readonly enquiryModel: Model<EnquiryDocument>,
  ) {}

  async create(createEnquiryDto: CreateEnquiryDto): Promise<EnquiryResponse> {
    const created = await this.enquiryModel.create({
      name: createEnquiryDto.name,
      company: createEnquiryDto.company ?? null,
      email: createEnquiryDto.email.toLowerCase(),
      phone: createEnquiryDto.phone,
      service: createEnquiryDto.service,
      message: createEnquiryDto.message,
    });

    return this.toResponse(created);
  }

  async list(): Promise<EnquiryResponse[]> {
    const enquiries = await this.enquiryModel
      .find()
      .sort({ createdAt: -1, _id: -1 })
      .exec();

    return enquiries.map((enquiry) => this.toResponse(enquiry));
  }

  async remove(id: string): Promise<void> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException('Enquiry not found');
    }

    const result = await this.enquiryModel.deleteOne({ _id: id }).exec();
    if (result.deletedCount !== 1) {
      throw new NotFoundException('Enquiry not found');
    }
  }

  private toResponse(enquiry: EnquiryDocument): EnquiryResponse {
    const timestamps = enquiry as EnquiryDocument & { createdAt: Date };

    return {
      id: enquiry._id.toString(),
      name: enquiry.name,
      company: enquiry.company ?? null,
      email: enquiry.email,
      phone: enquiry.phone,
      service: enquiry.service,
      message: enquiry.message,
      createdAt: new Date(timestamps.createdAt).toISOString(),
    };
  }
}
