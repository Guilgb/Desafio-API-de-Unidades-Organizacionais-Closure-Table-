import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { WinstonLoggerService } from '@shared/modules/winston/winston-logger.service';
import { NodeType } from '@shared/organization-core/entities';
import { UsersRepositoryInterface } from '../interfaces/repositories/user.repositories.interface';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let repository: UsersRepositoryInterface;
  let logger: WinstonLoggerService;

  const mockUsersRepository = {
    createUser: jest.fn(),
    findUserById: jest.fn(),
    findUserByEmail: jest.fn(),
    findNodeById: jest.fn(),
    checkCycle: jest.fn(),
    linkUserToGroup: jest.fn(),
    getUserOrganizations: jest.fn(),
  };

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepositoryInterface,
          useValue: mockUsersRepository,
        },
        {
          provide: WinstonLoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<UsersRepositoryInterface>(UsersRepositoryInterface);
    logger = module.get<WinstonLoggerService>(WinstonLoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a user successfully', async () => {
      const createUserDto = { name: 'John Doe', email: 'john@test.com' };
      const mockUser = {
        id: 'user-id',
        type: NodeType.USER,
        name: 'John Doe',
        email: 'john@test.com',
      };

      mockUsersRepository.findUserByEmail.mockResolvedValue(null);
      mockUsersRepository.createUser.mockResolvedValue(mockUser);

      const result = await service.createUser(createUserDto);

      expect(mockUsersRepository.findUserByEmail).toHaveBeenCalledWith(
        'john@test.com',
      );
      expect(mockUsersRepository.createUser).toHaveBeenCalledWith(
        'John Doe',
        'john@test.com',
      );
      expect(result).toEqual(mockUser);
      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      const createUserDto = { name: 'John', email: 'existing@test.com' };
      mockUsersRepository.findUserByEmail.mockResolvedValue({
        id: 'existing-id',
      });

      await expect(service.createUser(createUserDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Email already exists',
        undefined,
        expect.any(Object),
      );
    });

    it('should log error on creation failure', async () => {
      const createUserDto = { name: 'John', email: 'john@test.com' };
      mockUsersRepository.findUserByEmail.mockResolvedValue(null);
      mockUsersRepository.createUser.mockRejectedValue(new Error('DB Error'));

      await expect(service.createUser(createUserDto)).rejects.toThrow(
        'DB Error',
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('associateUserToGroup', () => {
    it('should associate user to group successfully', async () => {
      const mockUser = { id: 'user-id', type: NodeType.USER };
      const mockGroup = { id: 'group-id', type: NodeType.GROUP };

      mockUsersRepository.findUserById.mockResolvedValue(mockUser);
      mockUsersRepository.findNodeById.mockResolvedValue(mockGroup);
      mockUsersRepository.checkCycle.mockResolvedValue(false);
      mockUsersRepository.linkUserToGroup.mockResolvedValue(undefined);

      await service.associateUserToGroup('user-id', 'group-id');

      expect(mockUsersRepository.findUserById).toHaveBeenCalledWith('user-id');
      expect(mockUsersRepository.findNodeById).toHaveBeenCalledWith('group-id');
      expect(mockUsersRepository.checkCycle).toHaveBeenCalledWith(
        'group-id',
        'user-id',
      );
      expect(mockUsersRepository.linkUserToGroup).toHaveBeenCalledWith(
        'user-id',
        'group-id',
      );
      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUsersRepository.findUserById.mockResolvedValue(null);

      await expect(
        service.associateUserToGroup('user-id', 'group-id'),
      ).rejects.toThrow(NotFoundException);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'User node not found',
        undefined,
        expect.any(Object),
      );
    });

    it('should throw NotFoundException if group not found', async () => {
      mockUsersRepository.findUserById.mockResolvedValue({
        id: 'user-id',
        type: NodeType.USER,
      });
      mockUsersRepository.findNodeById.mockResolvedValue(null);

      await expect(
        service.associateUserToGroup('user-id', 'group-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnprocessableEntityException if target is not a GROUP', async () => {
      mockUsersRepository.findUserById.mockResolvedValue({
        id: 'user-id',
        type: NodeType.USER,
      });
      mockUsersRepository.findNodeById.mockResolvedValue({
        id: 'user-2',
        type: NodeType.USER,
      });

      await expect(
        service.associateUserToGroup('user-id', 'user-2'),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should throw ConflictException if cycle detected', async () => {
      mockUsersRepository.findUserById.mockResolvedValue({
        id: 'user-id',
        type: NodeType.USER,
      });
      mockUsersRepository.findNodeById.mockResolvedValue({
        id: 'group-id',
        type: NodeType.GROUP,
      });
      mockUsersRepository.checkCycle.mockResolvedValue(true);

      await expect(
        service.associateUserToGroup('user-id', 'group-id'),
      ).rejects.toThrow(ConflictException);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Creating this association would create a cycle',
        undefined,
        expect.any(Object),
      );
    });
  });

  describe('getUserOrganizations', () => {
    it('should return user organizations', async () => {
      const mockUser = { id: 'user-id', type: NodeType.USER };
      const mockOrganizations = [
        { id: 'org-1', name: 'Team', depth: 1 },
        { id: 'org-2', name: 'Department', depth: 2 },
      ];

      mockUsersRepository.findUserById.mockResolvedValue(mockUser);
      mockUsersRepository.getUserOrganizations.mockResolvedValue(
        mockOrganizations,
      );

      const result = await service.getUserOrganizations('user-id');

      expect(mockUsersRepository.findUserById).toHaveBeenCalledWith('user-id');
      expect(mockUsersRepository.getUserOrganizations).toHaveBeenCalledWith(
        'user-id',
      );
      expect(result).toEqual(mockOrganizations);
      expect(mockLogger.log).toHaveBeenCalledTimes(2);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUsersRepository.findUserById.mockResolvedValue(null);

      await expect(service.getUserOrganizations('user-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
