import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AssociateUserGroupDto, CreateGroupDto, CreateUserDto } from '../dtos';
import { NodesService } from '../services/nodes.service';

@ApiTags('Organization')
@Controller()
export class NodesController {
  constructor(private readonly nodesService: NodesService) {}

  @Post('users')
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async createUser(@Body(ValidationPipe) createUserDto: CreateUserDto) {
    return this.nodesService.createUser(createUserDto);
  }

  @Post('groups')
  @ApiOperation({ summary: 'Create a new group' })
  @ApiResponse({ status: 201, description: 'Group created successfully' })
  @ApiResponse({ status: 404, description: 'Parent node not found' })
  @ApiResponse({ status: 409, description: 'Cannot create cycle in hierarchy' })
  @ApiResponse({ status: 422, description: 'Parent must be a GROUP' })
  async createGroup(@Body(ValidationPipe) createGroupDto: CreateGroupDto) {
    return this.nodesService.createGroup(createGroupDto);
  }

  @Post('users/:id/groups')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Associate a user to a group' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 204,
    description: 'User associated to group successfully',
  })
  @ApiResponse({ status: 404, description: 'User or group not found' })
  @ApiResponse({ status: 409, description: 'Cannot create cycle in hierarchy' })
  @ApiResponse({ status: 422, description: 'Invalid node types' })
  async associateUserToGroup(
    @Param('id') userId: string,
    @Body(ValidationPipe) associateDto: AssociateUserGroupDto,
  ) {
    await this.nodesService.associateUserToGroup(userId, associateDto.groupId);
  }

  @Get('users/:id/organizations')
  @ApiOperation({ summary: 'Get organizations for a user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'List of organizations' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserOrganizations(@Param('id') userId: string) {
    return this.nodesService.getUserOrganizations(userId);
  }

  @Get('nodes/:id/ancestors')
  @ApiOperation({ summary: 'Get ancestors of a node' })
  @ApiParam({ name: 'id', description: 'Node ID' })
  @ApiResponse({ status: 200, description: 'List of ancestors' })
  @ApiResponse({ status: 404, description: 'Node not found' })
  async getNodeAncestors(@Param('id') nodeId: string) {
    return this.nodesService.getNodeAncestors(nodeId);
  }

  @Get('nodes/:id/descendants')
  @ApiOperation({ summary: 'Get descendants of a node' })
  @ApiParam({ name: 'id', description: 'Node ID' })
  @ApiResponse({ status: 200, description: 'List of descendants' })
  @ApiResponse({ status: 404, description: 'Node not found' })
  async getNodeDescendants(@Param('id') nodeId: string) {
    return this.nodesService.getNodeDescendants(nodeId);
  }
}
