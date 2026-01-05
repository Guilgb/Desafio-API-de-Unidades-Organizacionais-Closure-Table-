import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { WinstonLoggerService } from '@shared/modules/winston/winston-logger.service';
import { CreateUserDto } from '@shared/organization-core/dtos';
import { NodeType } from '@shared/organization-core/entities';
import { NodesRepository } from '@shared/organization-core/nodes.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly nodesRepository: NodesRepository,
    private readonly logger: WinstonLoggerService,
  ) {}

  async createUser(createUserDto: CreateUserDto) {
    this.logger.log('Creating user', undefined, {
      name: createUserDto.name,
      email: createUserDto.email,
    });

    // Check if email already exists
    const existingUser = await this.nodesRepository.findNodeByEmail(
      createUserDto.email,
    );
    if (existingUser) {
      this.logger.warn('Email already exists', undefined, {
        email: createUserDto.email,
      });
      throw new ConflictException({ message: 'Email already exists' });
    }

    try {
      const user = await this.nodesRepository.createNode(
        NodeType.USER,
        createUserDto.name,
        createUserDto.email,
      );

      this.logger.log('User created successfully', undefined, { id: user.id });

      return {
        id: user.id,
        type: user.type,
        name: user.name,
        email: user.email,
      };
    } catch (error) {
      this.logger.error('Error creating user', error.stack, undefined, {
        error: error.message,
      });
      throw error;
    }
  }

  async associateUserToGroup(userId: string, groupId: string) {
    this.logger.log('Associating user to group', undefined, {
      userId,
      groupId,
    });

    // Check if user exists and is a USER
    const user = await this.nodesRepository.findNodeById(userId);
    if (!user) {
      this.logger.warn('User node not found', undefined, { userId });
      throw new NotFoundException({ message: 'User not found' });
    }
    if (user.type !== NodeType.USER) {
      this.logger.warn('Node is not a USER', undefined, { userId });
      throw new UnprocessableEntityException({
        message: 'Node must be a USER',
      });
    }

    // Check if group exists and is a GROUP
    const group = await this.nodesRepository.findNodeById(groupId);
    if (!group) {
      this.logger.warn('Group node not found', undefined, { groupId });
      throw new NotFoundException({ message: 'Group not found' });
    }
    if (group.type !== NodeType.GROUP) {
      this.logger.warn('Node is not a GROUP', undefined, { groupId });
      throw new UnprocessableEntityException({
        message: 'Target must be a GROUP',
      });
    }

    // Check for cycles
    const wouldCreateCycle = await this.nodesRepository.checkCycle(
      groupId,
      userId,
    );
    if (wouldCreateCycle) {
      this.logger.warn(
        'Creating this association would create a cycle',
        undefined,
        { userId, groupId },
      );
      throw new ConflictException({
        message: 'Cannot create cycle in hierarchy',
      });
    }

    try {
      await this.nodesRepository.linkNodes(userId, groupId);
      this.logger.log('User associated to group successfully', undefined, {
        userId,
        groupId,
      });
    } catch (error) {
      this.logger.error(
        'Error associating user to group',
        error.stack,
        undefined,
        {
          error: error.message,
        },
      );
      throw error;
    }
  }

  async getUserOrganizations(userId: string) {
    this.logger.log('Getting user organizations', undefined, { userId });

    const user = await this.nodesRepository.findNodeById(userId);
    if (!user) {
      this.logger.warn('User not found', undefined, { userId });
      throw new NotFoundException({ message: 'User not found' });
    }

    const organizations = await this.nodesRepository.getOrganizations(userId);

    this.logger.log('Retrieved user organizations', undefined, {
      userId,
      count: organizations.length,
    });

    return organizations.map(org => ({
      id: org.id,
      name: org.name,
      depth: org.depth,
    }));
  }
}
