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
import { AssociateUserGroupDto, CreateUserDto } from '../dtos';
import { UsersService } from '../services/users.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async createUser(@Body(ValidationPipe) createUserDto: CreateUserDto) {
    return this.usersService.createUser(createUserDto);
  }

  @Post(':id/groups')
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
    await this.usersService.associateUserToGroup(userId, associateDto.groupId);
  }

  @Get(':id/organizations')
  @ApiOperation({ summary: 'Get organizations for a user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'List of organizations' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserOrganizations(@Param('id') userId: string) {
    return this.usersService.getUserOrganizations(userId);
  }
}
