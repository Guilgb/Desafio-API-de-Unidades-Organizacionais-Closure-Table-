import { Body, Controller, Post, ValidationPipe } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateGroupDto } from '@shared/organization-core/dtos';
import { GroupsService } from '../services/groups.service';

@ApiTags('Groups')
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new group' })
  @ApiResponse({ status: 201, description: 'Group created successfully' })
  @ApiResponse({ status: 404, description: 'Parent node not found' })
  @ApiResponse({ status: 409, description: 'Cannot create cycle in hierarchy' })
  @ApiResponse({ status: 422, description: 'Parent must be a GROUP' })
  async createGroup(@Body(ValidationPipe) createGroupDto: CreateGroupDto) {
    return this.groupsService.createGroup(createGroupDto);
  }
}
