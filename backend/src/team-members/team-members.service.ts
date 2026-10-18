import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import {
  TEAM_MEMBER_PHOTO_FOLDER,
  type TeamMemberStatus,
} from './constants/team-member.constants';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';
import {
  TeamMemberAdminResponse,
  TeamMemberPublicResponse,
  TeamMemberStatusResponse,
} from './interfaces/team-member-response.interface';
import { TeamMember, TeamMemberDocument } from './schemas/team-member.schema';

const TEAM_MEMBER_SORT = { order: 1, createdAt: 1, _id: 1 } as const;

@Injectable()
export class TeamMembersService {
  private readonly logger = new Logger(TeamMembersService.name);

  constructor(
    @InjectModel(TeamMember.name)
    private readonly teamMemberModel: Model<TeamMemberDocument>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  toPublicResponse(
    member: TeamMemberDocument | TeamMember,
  ): TeamMemberPublicResponse {
    const document = member as TeamMemberDocument;
    const id = document._id ? document._id.toString() : '';
    const photo = document.photo;

    if (!photo?.url) {
      throw new InternalServerErrorException(
        'Published team member is missing a photo',
      );
    }

    return {
      id,
      fullName: document.fullName,
      designation: document.designation,
      department: document.department,
      positionInCompany: document.positionInCompany,
      bio: document.bio ?? '',
      photo: { url: photo.url },
      order: document.order,
    };
  }

  toAdminResponse(
    member: TeamMemberDocument | TeamMember,
  ): TeamMemberAdminResponse {
    const document = member as TeamMemberDocument;
    const id = document._id ? document._id.toString() : '';

    return {
      id,
      fullName: document.fullName,
      designation: document.designation,
      department: document.department,
      positionInCompany: document.positionInCompany,
      bio: document.bio ?? '',
      photo: document.photo
        ? {
            url: document.photo.url,
            publicId: document.photo.publicId,
          }
        : null,
      order: document.order,
      status: document.status,
      createdAt: document.createdAt?.toISOString() ?? new Date(0).toISOString(),
      updatedAt: document.updatedAt?.toISOString() ?? new Date(0).toISOString(),
    };
  }

  async findAllPublished(): Promise<TeamMemberPublicResponse[]> {
    const members = await this.teamMemberModel
      .find({ status: 'published' })
      .sort(TEAM_MEMBER_SORT)
      .exec();

    return members.map((member) => this.toPublicResponse(member));
  }

  async findOnePublished(id: string): Promise<TeamMemberPublicResponse> {
    const member = await this.findPublishedDocumentById(id);
    return this.toPublicResponse(member);
  }

  async findAllAdmin(): Promise<TeamMemberAdminResponse[]> {
    const members = await this.teamMemberModel.find().sort(TEAM_MEMBER_SORT).exec();
    return members.map((member) => this.toAdminResponse(member));
  }

  async findOneAdmin(id: string): Promise<TeamMemberAdminResponse> {
    const member = await this.findDocumentById(id);
    return this.toAdminResponse(member);
  }

  async create(
    createTeamMemberDto: CreateTeamMemberDto,
  ): Promise<TeamMemberAdminResponse> {
    const created = await this.teamMemberModel.create({
      fullName: createTeamMemberDto.fullName,
      designation: createTeamMemberDto.designation,
      department: createTeamMemberDto.department,
      positionInCompany: createTeamMemberDto.positionInCompany,
      bio: createTeamMemberDto.bio ?? '',
      order: createTeamMemberDto.order,
      status: 'draft',
      photo: null,
    });

    return this.toAdminResponse(created);
  }

  async update(
    id: string,
    updateTeamMemberDto: UpdateTeamMemberDto,
  ): Promise<TeamMemberAdminResponse> {
    const existing = await this.findDocumentById(id);
    const update: Partial<TeamMember> = {};

    if (updateTeamMemberDto.fullName !== undefined) {
      update.fullName = updateTeamMemberDto.fullName;
    }
    if (updateTeamMemberDto.designation !== undefined) {
      update.designation = updateTeamMemberDto.designation;
    }
    if (updateTeamMemberDto.department !== undefined) {
      update.department = updateTeamMemberDto.department;
    }
    if (updateTeamMemberDto.positionInCompany !== undefined) {
      update.positionInCompany = updateTeamMemberDto.positionInCompany;
    }
    if (updateTeamMemberDto.bio !== undefined) {
      update.bio = updateTeamMemberDto.bio;
    }
    if (updateTeamMemberDto.order !== undefined) {
      update.order = updateTeamMemberDto.order;
    }

    const merged = { ...existing.toObject(), ...update };
    if (existing.status === 'published') {
      this.assertPublishable(merged as TeamMember);
    }

    const updated = await this.teamMemberModel
      .findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .exec();

    if (!updated) {
      throw new NotFoundException('Team member not found');
    }

    return this.toAdminResponse(updated);
  }

  async updateStatus(
    id: string,
    status: TeamMemberStatus,
  ): Promise<TeamMemberStatusResponse> {
    const existing = await this.findDocumentById(id);

    if (status === 'published') {
      this.assertPublishable(existing);
    }

    const updated = await this.teamMemberModel
      .findByIdAndUpdate(id, { status }, { new: true, runValidators: true })
      .exec();

    if (!updated) {
      throw new NotFoundException('Team member not found');
    }

    return {
      id: updated._id.toString(),
      status: updated.status,
    };
  }

  async remove(id: string): Promise<void> {
    const member = await this.findDocumentById(id);

    if (member.photo?.publicId) {
      await this.safeDeleteCloudinaryAsset(member.photo.publicId);
    }

    await this.teamMemberModel.findByIdAndDelete(id).exec();
  }

  async uploadPhoto(
    id: string,
    file: Express.Multer.File,
  ): Promise<TeamMemberAdminResponse> {
    await this.findDocumentById(id);

    const publicId = `${TEAM_MEMBER_PHOTO_FOLDER}/${id}`;
    const previous = await this.teamMemberModel.findById(id).exec();
    const previousPublicId = previous?.photo?.publicId;

    let uploaded: { url: string; publicId: string };
    try {
      uploaded = await this.cloudinaryService.uploadImage(file, {
        publicId,
      });
    } catch (error) {
      this.logger.error(
        `Failed to upload team member photo for ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new InternalServerErrorException('Failed to upload team member photo');
    }

    const updated = await this.teamMemberModel
      .findByIdAndUpdate(
        id,
        {
          photo: {
            url: uploaded.url,
            publicId: uploaded.publicId,
          },
        },
        { new: true, runValidators: true },
      )
      .exec();

    if (!updated) {
      await this.safeDeleteCloudinaryAsset(uploaded.publicId);
      throw new NotFoundException('Team member not found');
    }

    if (previousPublicId && previousPublicId !== uploaded.publicId) {
      await this.safeDeleteCloudinaryAsset(previousPublicId);
    }

    return this.toAdminResponse(updated);
  }

  async removePhoto(id: string): Promise<TeamMemberAdminResponse> {
    const member = await this.findDocumentById(id);

    if (member.status === 'published') {
      throw new BadRequestException(
        'Cannot remove the photo from a published team member. Unpublish or mark inactive first.',
      );
    }

    if (member.photo?.publicId) {
      await this.safeDeleteCloudinaryAsset(member.photo.publicId);
    }

    member.photo = null;
    await member.save();

    return this.toAdminResponse(member);
  }

  private assertPublishable(member: TeamMember): void {
    const missing: string[] = [];
    if (!member.fullName?.trim()) missing.push('fullName');
    if (!member.designation?.trim()) missing.push('designation');
    if (!member.department?.trim()) missing.push('department');
    if (!member.positionInCompany?.trim()) missing.push('positionInCompany');
    if (!member.photo?.url || !member.photo?.publicId) missing.push('photo');

    if (missing.length > 0) {
      throw new BadRequestException(
        `Cannot publish team member. Missing or invalid: ${missing.join(', ')}`,
      );
    }
  }

  private async findDocumentById(id: string): Promise<TeamMemberDocument> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException('Team member not found');
    }

    const member = await this.teamMemberModel.findById(id).exec();
    if (!member) {
      throw new NotFoundException('Team member not found');
    }

    return member;
  }

  private async findPublishedDocumentById(
    id: string,
  ): Promise<TeamMemberDocument> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException('Team member not found');
    }

    const member = await this.teamMemberModel
      .findOne({ _id: id, status: 'published' })
      .exec();

    if (!member) {
      throw new NotFoundException('Team member not found');
    }

    return member;
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
