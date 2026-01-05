import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { WinstonLoggerService } from '@shared/modules/winston/winston-logger.service';
import { NodeType } from '@shared/organization-core/entities';
import { CreateUserDto } from '../dtos';
import { UsersRepository } from '../repositories/users.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly logger: WinstonLoggerService,
  ) {}

  async createUser(createUserDto: CreateUserDto) {
    this.logger.log('Creating user', undefined, {
      name: createUserDto.name,
      email: createUserDto.email,
    });

    // Check if email already exists
    const existingUser = await this.usersRepository.findUserByEmail(
      createUserDto.email,
    );
    if (existingUser) {
      this.logger.warn('Email already exists', undefined, {
        email: createUserDto.email,
      });
      throw new ConflictException({ message: 'Email already exists' });
    }

    try {
      const user = await this.usersRepository.createUser(
        createUserDto.name,
        createUserDto.email,
      );

      this.logger.log('User created successfully', undefined, { id: user.id });

      return user;
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
    const user = await this.usersRepository.findUserById(userId);
    if (!user) {
      this.logger.warn('User node not found', undefined, { userId });
      throw new NotFoundException({ message: 'User not found' });
    }

    // Check if group exists and is a GROUP
    const group = await this.usersRepository.findNodeById(groupId);
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
    const wouldCreateCycle = await this.usersRepository.checkCycle(
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
      await this.usersRepository.linkUserToGroup(userId, groupId);
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

    const user = await this.usersRepository.findUserById(userId);
    if (!user) {
      this.logger.warn('User not found', undefined, { userId });
      throw new NotFoundException({ message: 'User not found' });
    }

    const organizations =
      await this.usersRepository.getUserOrganizations(userId);

    this.logger.log('Retrieved user organizations', undefined, {
      userId,
      count: organizations.length,
    });

    return organizations;
  }
}
