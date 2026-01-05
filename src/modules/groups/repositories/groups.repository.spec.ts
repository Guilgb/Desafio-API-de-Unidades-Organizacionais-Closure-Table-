import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ClosureEntity,
  NodeEntity,
  NodeType,
} from '@shared/organization-core/entities';
import { DataSource, Repository } from 'typeorm';
import { GroupsRepository } from './groups.repository';

describe('GroupsRepository', () => {
  let repository: GroupsRepository;
  let nodeRepository: Repository<NodeEntity>;
  let closureRepository: Repository<ClosureEntity>;
  let dataSource: DataSource;

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      create: jest.fn(),
      save: jest.fn(),
      query: jest.fn(),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn(() => mockQueryRunner),
  };

  const mockNodeRepository = {
    findOne: jest.fn(),
  };

  const mockClosureRepository = {
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupsRepository,
        {
          provide: getRepositoryToken(NodeEntity),
          useValue: mockNodeRepository,
        },
        {
          provide: getRepositoryToken(ClosureEntity),
          useValue: mockClosureRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    repository = module.get<GroupsRepository>(GroupsRepository);
    nodeRepository = module.get<Repository<NodeEntity>>(
      getRepositoryToken(NodeEntity),
    );
    closureRepository = module.get<Repository<ClosureEntity>>(
      getRepositoryToken(ClosureEntity),
    );
    dataSource = module.get<DataSource>(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createGroup', () => {
    it('should create a group with self-link closure', async () => {
      const mockGroup = {
        id: 'group-id',
        type: NodeType.GROUP,
        name: 'Engineering',
      };

      mockQueryRunner.manager.create.mockReturnValue(mockGroup);
      mockQueryRunner.manager.save.mockResolvedValue(mockGroup);

      const result = await repository.createGroup('Engineering');

      expect(mockDataSource.createQueryRunner).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(NodeEntity, {
        type: NodeType.GROUP,
        name: 'Engineering',
        email: null,
      });
      expect(mockQueryRunner.manager.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO closure'),
        [mockGroup.id],
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(result).toEqual({
        id: mockGroup.id,
        type: mockGroup.type,
        name: mockGroup.name,
      });
    });

    it('should rollback on error', async () => {
      mockQueryRunner.manager.save.mockRejectedValue(new Error('DB Error'));

      await expect(repository.createGroup('Test')).rejects.toThrow('DB Error');

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('findGroupById', () => {
    it('should find group by id', async () => {
      const mockGroup = { id: 'group-id', type: NodeType.GROUP, name: 'Team' };
      mockNodeRepository.findOne.mockResolvedValue(mockGroup);

      const result = await repository.findGroupById('group-id');

      expect(mockNodeRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'group-id', type: NodeType.GROUP },
      });
      expect(result).toEqual(mockGroup);
    });
  });

  describe('checkCycle', () => {
    it('should detect cycles correctly', async () => {
      const mockGetOne = jest.fn().mockResolvedValue({ id: 1 });
      const mockWhere = jest.fn().mockReturnValue({ getOne: mockGetOne });
      mockClosureRepository.createQueryBuilder.mockReturnValue({
        where: mockWhere,
      });

      const result = await repository.checkCycle('child-id', 'parent-id');

      expect(result).toBe(true);
    });

    it('should return false when no cycle', async () => {
      const mockGetOne = jest.fn().mockResolvedValue(null);
      const mockWhere = jest.fn().mockReturnValue({ getOne: mockGetOne });
      mockClosureRepository.createQueryBuilder.mockReturnValue({
        where: mockWhere,
      });

      const result = await repository.checkCycle('child-id', 'parent-id');

      expect(result).toBe(false);
    });
  });

  describe('linkGroupToParent', () => {
    it('should link group to parent with closure propagation', async () => {
      await repository.linkGroupToParent('group-id', 'parent-id');

      expect(mockDataSource.createQueryRunner).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.manager.query).toHaveBeenCalledWith(
        expect.stringContaining('CROSS JOIN'),
        ['parent-id', 'group-id'],
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should rollback on error', async () => {
      mockQueryRunner.manager.query.mockRejectedValue(new Error('Link Error'));

      await expect(repository.linkGroupToParent('g1', 'g2')).rejects.toThrow(
        'Link Error',
      );

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });
});
