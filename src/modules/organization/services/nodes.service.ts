import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { WinstonLoggerService } from '@shared/modules/winston/winston-logger.service';
import { CreateGroupDto, CreateUserDto } from '../dtos';
import { NodeType } from '../entities';
import { NodesRepository } from '../repositories/nodes.repository';

@Injectable()
export class NodesService {
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

  async createGroup(createGroupDto: CreateGroupDto) {
    this.logger.log('Creating group', undefined, {
      name: createGroupDto.name,
      parentId: createGroupDto.parentId,
    });

    try {
      // Check if parent exists and is a GROUP
      if (createGroupDto.parentId) {
        const parent = await this.nodesRepository.findNodeById(
          createGroupDto.parentId,
        );
        if (!parent) {
          this.logger.warn('Parent node not found', undefined, {
            parentId: createGroupDto.parentId,
          });
          throw new NotFoundException({ message: 'Parent node not found' });
        }
        if (parent.type !== NodeType.GROUP) {
          this.logger.warn('Parent node is not a GROUP', undefined, {
            parentId: createGroupDto.parentId,
          });
          throw new UnprocessableEntityException({
            message: 'Parent must be a GROUP',
          });
        }
      }

      const group = await this.nodesRepository.createNode(
        NodeType.GROUP,
        createGroupDto.name,
      );

      // Link to parent if provided
      if (createGroupDto.parentId) {
        // Check for cycles
        const wouldCreateCycle = await this.nodesRepository.checkCycle(
          createGroupDto.parentId,
          group.id,
        );
        if (wouldCreateCycle) {
          this.logger.warn(
            'Creating this link would create a cycle',
            undefined,
            {
              childId: group.id,
              parentId: createGroupDto.parentId,
            },
          );
          throw new ConflictException({
            message: 'Cannot create cycle in hierarchy',
          });
        }

        await this.nodesRepository.linkNodes(group.id, createGroupDto.parentId);
        this.logger.log('Group linked to parent', undefined, {
          groupId: group.id,
          parentId: createGroupDto.parentId,
        });
      }

      this.logger.log('Group created successfully', undefined, {
        id: group.id,
      });

      return {
        id: group.id,
        type: group.type,
        name: group.name,
      };
    } catch (error) {
      this.logger.error('Error creating group', error.stack, undefined, {
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
        { error: error.message },
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

  async getNodeAncestors(nodeId: string) {
    this.logger.log('Getting node ancestors', undefined, { nodeId });

    const node = await this.nodesRepository.findNodeById(nodeId);
    if (!node) {
      this.logger.warn('Node not found', undefined, { nodeId });
      throw new NotFoundException({ message: 'Node not found' });
    }

    const ancestors = await this.nodesRepository.getAncestors(nodeId);

    this.logger.log('Retrieved node ancestors', undefined, {
      nodeId,
      count: ancestors.length,
    });

    return ancestors.map(ancestor => ({
      id: ancestor.id,
      name: ancestor.name,
      depth: ancestor.depth,
    }));
  }

  async getNodeDescendants(nodeId: string) {
    this.logger.log('Getting node descendants', undefined, { nodeId });

    const node = await this.nodesRepository.findNodeById(nodeId);
    if (!node) {
      this.logger.warn('Node not found', undefined, { nodeId });
      throw new NotFoundException({ message: 'Node not found' });
    }

    const descendants = await this.nodesRepository.getDescendants(nodeId);

    this.logger.log('Retrieved node descendants', undefined, {
      nodeId,
      count: descendants.length,
    });

    return descendants.map(descendant => ({
      id: descendant.id,
      name: descendant.name,
      depth: descendant.depth,
    }));
  }
}
