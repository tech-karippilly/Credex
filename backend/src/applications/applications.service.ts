import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { basename, extname } from 'path';
import { isValidObjectId, Model, Types } from 'mongoose';
import { AiService } from '../ai/ai.service';
import { CareersService } from '../careers/careers.service';
import { CareerDocument } from '../careers/schemas/career.schema';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { ApplicationStatus } from './constants/application-status';
import { CreateApplicationDto } from './dto/create-application.dto';
import { ApplicationResponse } from './interfaces/application-response.interface';
import { parseAiAnalysis } from './parse-ai-analysis';
import { buildResumeAnalysisPrompt } from './resume-analysis.prompt';
import { ResumeContentService } from './resume-content.service';
import { Application, ApplicationDocument } from './schemas/application.schema';

const RESUME_FOLDER = 'credex/resumes';
const RESUME_MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.doc', '.docx']);
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/octet-stream',
  'application/zip',
]);

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(
    @InjectModel(Application.name)
    private readonly applicationModel: Model<ApplicationDocument>,
    private readonly careersService: CareersService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly aiService: AiService,
    private readonly resumeContentService: ResumeContentService,
  ) {}

  async create(
    createApplicationDto: CreateApplicationDto,
  ): Promise<ApplicationResponse> {
    await this.careersService.requireVisible(createApplicationDto.careerId);

    const created = await this.applicationModel.create({
      careerId: new Types.ObjectId(createApplicationDto.careerId),
      candidate: {
        name: createApplicationDto.name,
        email: createApplicationDto.email.toLowerCase(),
        phone: createApplicationDto.phone,
        experience: createApplicationDto.experience,
        location: createApplicationDto.location,
      },
      coverLetter: createApplicationDto.coverLetter ?? null,
      resume: null,
      status: ApplicationStatus.NEW,
      aiAnalysis: null,
    });

    return this.toResponse(created);
  }

  async uploadResume(
    id: string,
    file: Express.Multer.File,
  ): Promise<ApplicationResponse> {
    this.assertResumeFile(file);
    const application = await this.findDocumentById(id);
    const previousPublicId = application.resume?.publicId;

    let uploaded: { url: string; publicId: string };
    try {
      uploaded = await this.cloudinaryService.uploadDocument(file, {
        folder: RESUME_FOLDER,
      });
    } catch (error) {
      this.logger.error(
        `Failed to upload resume for ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new InternalServerErrorException('Failed to upload resume');
    }

    application.resume = {
      url: uploaded.url,
      publicId: uploaded.publicId,
      fileName: this.safeFileName(file.originalname),
      mimeType: this.resolveMimeType(file),
    };
    application.aiAnalysis = null;

    try {
      await application.save();
    } catch (error) {
      await this.safeDeleteResume(uploaded.publicId);
      throw error;
    }

    if (previousPublicId && previousPublicId !== uploaded.publicId) {
      await this.safeDeleteResume(previousPublicId);
    }

    return this.toResponse(application);
  }

  async findAll(careerId?: string): Promise<ApplicationResponse[]> {
    const filter = careerId ? { careerId: new Types.ObjectId(careerId) } : {};
    const applications = await this.applicationModel
      .find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .exec();
    const responses = await this.toResponses(applications);

    if (!careerId) {
      return responses;
    }

    return responses.sort((left, right) => {
      const leftScore = left.aiAnalysis?.score ?? -1;
      const rightScore = right.aiAnalysis?.score ?? -1;
      if (rightScore !== leftScore) {
        return rightScore - leftScore;
      }

      return (
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      );
    });
  }

  async findOne(id: string): Promise<ApplicationResponse> {
    const application = await this.findDocumentById(id);
    return this.toResponse(application);
  }

  async updateStatus(
    id: string,
    status: ApplicationStatus,
  ): Promise<ApplicationResponse> {
    const application = await this.findDocumentById(id);
    application.status = status;
    await application.save();
    return this.toResponse(application);
  }

  async remove(id: string): Promise<void> {
    const application = await this.findDocumentById(id);
    const resumePublicId = application.resume?.publicId;

    await this.applicationModel.deleteOne({ _id: application._id }).exec();

    if (resumePublicId) {
      await this.safeDeleteResume(resumePublicId);
    }
  }

  async analyze(id: string): Promise<ApplicationResponse> {
    const application = await this.findDocumentById(id);
    if (!application.resume) {
      throw new BadRequestException('Upload a resume before running analysis');
    }

    const career = await this.careersService.requireById(
      application.careerId.toString(),
    );
    const resumeText = await this.resumeContentService.readFromUrl(
      application.resume.url,
      application.resume.mimeType,
      application.resume.fileName,
    );
    const prompt = buildResumeAnalysisPrompt(career, application, resumeText);

    let raw: string;
    try {
      raw = await this.aiService.generateText(prompt);
    } catch (error) {
      this.logger.error(
        `Gemini analysis failed for ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new InternalServerErrorException('Resume analysis failed');
    }

    const analysis = parseAiAnalysis(raw);
    application.aiAnalysis = {
      ...analysis,
      analyzedAt: new Date(),
    };
    await application.save();

    return this.toResponse(application);
  }

  private assertResumeFile(file: Express.Multer.File | undefined): void {
    if (!file) {
      throw new BadRequestException('Resume file is required');
    }

    if (file.size > RESUME_MAX_BYTES) {
      throw new BadRequestException('Resume must be 10 MB or smaller');
    }

    const extension = extname(file.originalname ?? '').toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      throw new BadRequestException('Resume must be a PDF, DOC, or DOCX file');
    }

    if (file.mimetype && !ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Resume must be a PDF, DOC, or DOCX file');
    }
  }

  private resolveMimeType(file: Express.Multer.File): string {
    const extension = extname(file.originalname ?? '').toLowerCase();
    if (extension === '.pdf') {
      return 'application/pdf';
    }
    if (extension === '.doc') {
      return 'application/msword';
    }
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }

  private safeFileName(originalName: string): string {
    const base = basename(originalName).replace(/[^\w.\- ()]/g, '_');
    return base.slice(0, 180) || 'resume';
  }

  private async findDocumentById(id: string): Promise<ApplicationDocument> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException('Application not found');
    }

    const application = await this.applicationModel.findById(id).exec();
    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return application;
  }

  private async toResponses(
    applications: ApplicationDocument[],
  ): Promise<ApplicationResponse[]> {
    const careerIds = [
      ...new Set(
        applications.map((application) => application.careerId.toString()),
      ),
    ];
    const careers = await this.careersService.findByIds(careerIds);
    const careersById = new Map(
      careers.map((career) => [career._id.toString(), career]),
    );

    return Promise.all(
      applications.map((application) =>
        this.toResponse(
          application,
          careersById.get(application.careerId.toString()) ?? null,
        ),
      ),
    );
  }

  private async toResponse(
    application: ApplicationDocument,
    career?: CareerDocument | null,
  ): Promise<ApplicationResponse> {
    const relatedCareer =
      career === undefined
        ? await this.careersService.findOptionalById(
            application.careerId.toString(),
          )
        : career;
    const timestamps = application as ApplicationDocument & {
      createdAt: Date;
      updatedAt: Date;
    };

    return {
      id: application._id.toString(),
      careerId: application.careerId.toString(),
      career: relatedCareer
        ? {
            id: relatedCareer._id.toString(),
            title: relatedCareer.title,
            isVisible: relatedCareer.isVisible,
          }
        : null,
      candidate: {
        name: application.candidate.name,
        email: application.candidate.email,
        phone: application.candidate.phone,
        experience: application.candidate.experience,
        location: application.candidate.location,
      },
      coverLetter: application.coverLetter ?? null,
      resume: application.resume
        ? {
            url: application.resume.url,
            publicId: application.resume.publicId,
            fileName: application.resume.fileName,
            mimeType: application.resume.mimeType,
          }
        : null,
      status: application.status,
      aiAnalysis: application.aiAnalysis
        ? {
            score: application.aiAnalysis.score,
            summary: application.aiAnalysis.summary,
            strengths: application.aiAnalysis.strengths ?? [],
            gaps: application.aiAnalysis.gaps ?? [],
            recommendation: application.aiAnalysis.recommendation,
            analyzedAt: new Date(
              application.aiAnalysis.analyzedAt,
            ).toISOString(),
          }
        : null,
      createdAt: new Date(timestamps.createdAt).toISOString(),
      updatedAt: new Date(timestamps.updatedAt).toISOString(),
    };
  }

  private async safeDeleteResume(publicId: string): Promise<void> {
    try {
      await this.cloudinaryService.deleteAsset(publicId, 'raw');
    } catch (error) {
      this.logger.warn(
        `Failed to delete resume ${publicId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
