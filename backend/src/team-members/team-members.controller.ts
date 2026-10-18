import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';
import { UpdateTeamMemberStatusDto } from './dto/update-team-member-status.dto';
import { TeamMembersService } from './team-members.service';

const TEAM_MEMBER_PHOTO_MAX_BYTES = 5 * 1024 * 1024;

@Controller('team-members')
export class TeamMembersController {
  constructor(private readonly teamMembersService: TeamMembersService) {}

  @Get('admin')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('team_members.read')
  async findAllAdmin() {
    const data = await this.teamMembersService.findAllAdmin();

    return {
      success: true,
      message: 'Team members fetched successfully',
      data,
    };
  }

  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('team_members.read')
  async findOneAdmin(@Param('id') id: string) {
    const data = await this.teamMembersService.findOneAdmin(id);

    return {
      success: true,
      message: 'Team member fetched successfully',
      data,
    };
  }

  @Get()
  async findAll() {
    const data = await this.teamMembersService.findAllPublished();

    return {
      success: true,
      message: 'Team members fetched successfully',
      data,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.teamMembersService.findOnePublished(id);

    return {
      success: true,
      message: 'Team member fetched successfully',
      data,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('team_members.create')
  async create(@Body() createTeamMemberDto: CreateTeamMemberDto) {
    const data = await this.teamMembersService.create(createTeamMemberDto);

    return {
      success: true,
      message: 'Team member created successfully',
      data,
    };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('team_members.update')
  async update(
    @Param('id') id: string,
    @Body() updateTeamMemberDto: UpdateTeamMemberDto,
  ) {
    const data = await this.teamMembersService.update(id, updateTeamMemberDto);

    return {
      success: true,
      message: 'Team member updated successfully',
      data,
    };
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('team_members.status.update')
  async updateStatus(
    @Param('id') id: string,
    @Body() updateTeamMemberStatusDto: UpdateTeamMemberStatusDto,
  ) {
    const data = await this.teamMembersService.updateStatus(
      id,
      updateTeamMemberStatusDto.status,
    );

    return {
      success: true,
      message: 'Team member status updated successfully',
      data,
    };
  }

  @Post(':id/photo')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('team_members.update')
  @UseInterceptors(FileInterceptor('image'))
  async uploadPhoto(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: TEAM_MEMBER_PHOTO_MAX_BYTES }),
          new FileTypeValidator({
            fileType: /(image\/jpeg|image\/jpg|image\/png)$/,
            fallbackToMimetype: true,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const data = await this.teamMembersService.uploadPhoto(id, file);

    return {
      success: true,
      message: 'Team member photo uploaded successfully',
      data,
    };
  }

  @Delete(':id/photo')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('team_members.update')
  async removePhoto(@Param('id') id: string) {
    const data = await this.teamMembersService.removePhoto(id);

    return {
      success: true,
      message: 'Team member photo removed successfully',
      data,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('team_members.delete')
  async remove(@Param('id') id: string) {
    await this.teamMembersService.remove(id);

    return {
      success: true,
      message: 'Team member deleted successfully',
    };
  }
}
