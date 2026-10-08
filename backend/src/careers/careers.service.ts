import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { CreateCareerDto } from './dto/create-career.dto';
import { UpdateCareerDto } from './dto/update-career.dto';
import {
  CareerAdminResponse,
  CareerPublicResponse,
  CareerVisibilityResponse,
} from './interfaces/career-response.interface';
import { Career, CareerDocument } from './schemas/career.schema';

const CAREER_SORT = { order: 1, createdAt: 1, _id: 1 } as const;

@Injectable()
export class CareersService {
  constructor(
    @InjectModel(Career.name)
    private readonly careerModel: Model<CareerDocument>,
  ) {}

  toPublicResponse(career: CareerDocument | Career): CareerPublicResponse {
    const document = career as CareerDocument;
    const id = document._id ? document._id.toString() : '';

    return {
      id,
      title: document.title,
      location: document.location,
      employmentType: document.employmentType,
      experience: document.experience,
      workplace: document.workplace,
      salary: document.salary,
      responsibilities: document.responsibilities ?? [],
      requirements: document.requirements ?? [],
      goodToHave: document.goodToHave ?? [],
      order: document.order,
    };
  }

  toAdminResponse(career: CareerDocument | Career): CareerAdminResponse {
    return {
      ...this.toPublicResponse(career),
      isVisible: (career as CareerDocument).isVisible,
    };
  }

  async findAllVisible(): Promise<CareerPublicResponse[]> {
    const careers = await this.careerModel
      .find({ isVisible: true })
      .sort(CAREER_SORT)
      .exec();

    return careers.map((career) => this.toPublicResponse(career));
  }

  async findOneVisible(id: string): Promise<CareerPublicResponse> {
    const career = await this.findVisibleDocumentById(id);
    return this.toPublicResponse(career);
  }

  async findAllAdmin(): Promise<CareerAdminResponse[]> {
    const careers = await this.careerModel.find().sort(CAREER_SORT).exec();

    return careers.map((career) => this.toAdminResponse(career));
  }

  async findOneAdmin(id: string): Promise<CareerAdminResponse> {
    const career = await this.findDocumentById(id);
    return this.toAdminResponse(career);
  }

  async create(createCareerDto: CreateCareerDto): Promise<CareerAdminResponse> {
    const created = await this.careerModel.create({
      title: createCareerDto.title,
      location: createCareerDto.location,
      employmentType: createCareerDto.employmentType,
      experience: createCareerDto.experience,
      workplace: createCareerDto.workplace,
      salary: createCareerDto.salary,
      responsibilities: createCareerDto.responsibilities ?? [],
      requirements: createCareerDto.requirements ?? [],
      goodToHave: createCareerDto.goodToHave ?? [],
      order: createCareerDto.order,
      isVisible: createCareerDto.isVisible ?? true,
    });

    return this.toAdminResponse(created);
  }

  async update(
    id: string,
    updateCareerDto: UpdateCareerDto,
  ): Promise<CareerAdminResponse> {
    const update: Partial<Career> = {};

    if (updateCareerDto.title !== undefined) {
      update.title = updateCareerDto.title;
    }
    if (updateCareerDto.location !== undefined) {
      update.location = updateCareerDto.location;
    }
    if (updateCareerDto.employmentType !== undefined) {
      update.employmentType = updateCareerDto.employmentType;
    }
    if (updateCareerDto.experience !== undefined) {
      update.experience = updateCareerDto.experience;
    }
    if (updateCareerDto.workplace !== undefined) {
      update.workplace = updateCareerDto.workplace;
    }
    if (updateCareerDto.salary !== undefined) {
      update.salary = updateCareerDto.salary;
    }
    if (updateCareerDto.responsibilities !== undefined) {
      update.responsibilities = updateCareerDto.responsibilities;
    }
    if (updateCareerDto.requirements !== undefined) {
      update.requirements = updateCareerDto.requirements;
    }
    if (updateCareerDto.goodToHave !== undefined) {
      update.goodToHave = updateCareerDto.goodToHave;
    }
    if (updateCareerDto.order !== undefined) {
      update.order = updateCareerDto.order;
    }
    if (updateCareerDto.isVisible !== undefined) {
      update.isVisible = updateCareerDto.isVisible;
    }

    const updated = await this.careerModel
      .findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .exec();

    if (!updated) {
      throw new NotFoundException('Career not found');
    }

    return this.toAdminResponse(updated);
  }

  async updateVisibility(
    id: string,
    isVisible: boolean,
  ): Promise<CareerVisibilityResponse> {
    const updated = await this.careerModel
      .findByIdAndUpdate(id, { isVisible }, { new: true, runValidators: true })
      .exec();

    if (!updated) {
      throw new NotFoundException('Career not found');
    }

    return {
      id: updated._id.toString(),
      isVisible: updated.isVisible,
    };
  }

  async remove(id: string): Promise<void> {
    await this.findDocumentById(id);
    await this.careerModel.findByIdAndDelete(id).exec();
  }

  private async findDocumentById(id: string): Promise<CareerDocument> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException('Career not found');
    }

    const career = await this.careerModel.findById(id).exec();
    if (!career) {
      throw new NotFoundException('Career not found');
    }

    return career;
  }

  private async findVisibleDocumentById(id: string): Promise<CareerDocument> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException('Career not found');
    }

    const career = await this.careerModel
      .findOne({ _id: id, isVisible: true })
      .exec();

    if (!career) {
      throw new NotFoundException('Career not found');
    }

    return career;
  }
}
