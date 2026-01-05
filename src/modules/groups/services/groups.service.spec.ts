import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { WinstonLoggerService } from '@shared/modules/winston/winston-logger.service';
import { NodeType } from '@shared/organization-core/entities';
import { GroupsRepositoryInterface } from '../interfaces/repositories/group.repository.interface';
import { GroupsService } from './groups.service';

describe('GroupsService', () => {
  let service: GroupsService;
  let repository: GroupsRepositoryInterface;
  let logger: WinstonLoggerService;

  const mockGroupsRepository = {
    createGroup: jest.fn(),
    findGroupById: jest.fn(),
    findNodeById: jest.fn(),
    checkCycle: jest.fn(),
    linkGroupToParent: jest.fn(),
  };

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupsService,
        {
          provide: GroupsRepositoryInterface,
          useValue: mockGroupsRepository,
        },
        {
          provide: WinstonLoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<GroupsService>(GroupsService);
    repository = module.get<GroupsRepositoryInterface>(
      GroupsRepositoryInterface,
    );
    logger = module.get<WinstonLoggerService>(WinstonLoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createGroup', () => {
    it('should create a group without parent', async () => {
      const createGroupDto = { name: 'Engineering' };
      const mockGroup = {
        id: 'group-id',
        type: NodeType.GROUP,
        name: 'Engineering',
      };

      mockGroupsRepository.createGroup.mockResolvedValue(mockGroup);

      const result = await service.createGroup(createGroupDto);

      expect(mockGroupsRepository.createGroup).toHaveBeenCalledWith(
        'Engineering',
      );
      expect(result).toEqual(mockGroup);
      expect(mockLogger.log).toHaveBeenCalledTimes(2);
    });

    it('should create a group with parent', async () => {
      const createGroupDto = { name: 'Backend Team', parentId: 'parent-id' };
      const mockParent = { id: 'parent-id', type: NodeType.GROUP };
      const mockGroup = {
        id: 'group-id',
        type: NodeType.GROUP,
        name: 'Backend Team',
      };

      mockGroupsRepository.findNodeById.mockResolvedValue(mockParent);
      mockGroupsRepository.createGroup.mockResolvedValue(mockGroup);
      mockGroupsRepository.checkCycle.mockResolvedValue(false);
      mockGroupsRepository.linkGroupToParent.mockResolvedValue(undefined);

      const result = await service.createGroup(createGroupDto);

      expect(mockGroupsRepository.findNodeById).toHaveBeenCalledWith(
        'parent-id',
      );
      expect(mockGroupsRepository.checkCycle).toHaveBeenCalledWith(
        'parent-id',
        'group-id',
      );
      expect(mockGroupsRepository.linkGroupToParent).toHaveBeenCalledWith(
        'group-id',
        'parent-id',
      );
      expect(result).toEqual(mockGroup);
    });

    it('should throw NotFoundException if parent not found', async () => {
      const createGroupDto = { name: 'Team', parentId: 'non-existent' };
      mockGroupsRepository.findNodeById.mockResolvedValue(null);

      await expect(service.createGroup(createGroupDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Parent node not found',
        undefined,
        expect.any(Object),
      );
    });

    it('should throw UnprocessableEntityException if parent is not a GROUP', async () => {
      const createGroupDto = { name: 'Team', parentId: 'user-id' };
      mockGroupsRepository.findNodeById.mockResolvedValue({
        id: 'user-id',
        type: NodeType.USER,
      });

      await expect(service.createGroup(createGroupDto)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('should throw ConflictException if cycle detected', async () => {
      const createGroupDto = { name: 'Team', parentId: 'parent-id' };
      const mockParent = { id: 'parent-id', type: NodeType.GROUP };
      const mockGroup = { id: 'group-id', type: NodeType.GROUP, name: 'Team' };

      mockGroupsRepository.findNodeById.mockResolvedValue(mockParent);
      mockGroupsRepository.createGroup.mockResolvedValue(mockGroup);
      mockGroupsRepository.checkCycle.mockResolvedValue(true);

      await expect(service.createGroup(createGroupDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Creating this link would create a cycle',
        undefined,
        expect.any(Object),
      );
    });

    it('should log error on creation failure', async () => {
      const createGroupDto = { name: 'Team' };
      mockGroupsRepository.createGroup.mockRejectedValue(new Error('DB Error'));

      await expect(service.createGroup(createGroupDto)).rejects.toThrow(
        'DB Error',
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
