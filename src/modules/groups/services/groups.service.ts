import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { WinstonLoggerService } from '@shared/modules/winston/winston-logger.service';
import { CreateGroupDto } from '@shared/organization-core/dtos';
import { NodeType } from '@shared/organization-core/entities';
import { NodesRepository } from '@shared/organization-core/nodes.repository';

@Injectable()
export class GroupsService {
  constructor(
    private readonly nodesRepository: NodesRepository,
    private readonly logger: WinstonLoggerService,
  ) {}

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
}
