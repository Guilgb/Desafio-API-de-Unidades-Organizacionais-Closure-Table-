import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ClosureEntity,
  NodeEntity,
  NodeType,
} from '@shared/organization-core/entities';
import { DataSource, Repository } from 'typeorm';
import { UsersRepository } from './users.repository';

describe('UsersRepository', () => {
  let repository: UsersRepository;
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
    query: jest.fn(),
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
        UsersRepository,
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

    repository = module.get<UsersRepository>(UsersRepository);
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

  describe('createUser', () => {
    it('should create a user with self-link closure', async () => {
      const mockUser = {
        id: 'user-id',
        type: NodeType.USER,
        name: 'John Doe',
        email: 'john@example.com',
      };

      mockQueryRunner.manager.create.mockReturnValue(mockUser);
      mockQueryRunner.manager.save.mockResolvedValue(mockUser);

      const result = await repository.createUser(
        'John Doe',
        'john@example.com',
      );

      expect(mockDataSource.createQueryRunner).toHaveBeenCalled();
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(NodeEntity, {
        type: NodeType.USER,
        name: 'John Doe',
        email: 'john@example.com',
      });
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(mockUser);
      expect(mockQueryRunner.manager.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO closure'),
        [mockUser.id],
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(result).toEqual({
        id: mockUser.id,
        type: mockUser.type,
        name: mockUser.name,
        email: mockUser.email,
      });
    });

    it('should rollback transaction on error', async () => {
      mockQueryRunner.manager.save.mockRejectedValue(new Error('DB Error'));

      await expect(
        repository.createUser('John', 'john@test.com'),
      ).rejects.toThrow('DB Error');

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('findUserById', () => {
    it('should find user by id', async () => {
      const mockUser = { id: 'user-id', type: NodeType.USER, name: 'John' };
      mockNodeRepository.findOne.mockResolvedValue(mockUser);

      const result = await repository.findUserById('user-id');

      expect(mockNodeRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-id', type: NodeType.USER },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      mockNodeRepository.findOne.mockResolvedValue(null);

      const result = await repository.findUserById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findUserByEmail', () => {
    it('should find user by email', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@test.com',
        type: NodeType.USER,
      };
      mockNodeRepository.findOne.mockResolvedValue(mockUser);

      const result = await repository.findUserByEmail('test@test.com');

      expect(mockNodeRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@test.com', type: NodeType.USER },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('checkCycle', () => {
    it('should return true if cycle exists', async () => {
      const mockGetOne = jest.fn().mockResolvedValue({ id: 1 });
      const mockWhere = jest.fn().mockReturnValue({ getOne: mockGetOne });
      mockClosureRepository.createQueryBuilder.mockReturnValue({
        where: mockWhere,
      });

      const result = await repository.checkCycle('child-id', 'parent-id');

      expect(mockClosureRepository.createQueryBuilder).toHaveBeenCalledWith(
        'c',
      );
      expect(mockWhere).toHaveBeenCalledWith(
        'c.ancestor = :parent AND c.descendant = :child',
        { parent: 'parent-id', child: 'child-id' },
      );
      expect(result).toBe(true);
    });

    it('should return false if no cycle exists', async () => {
      const mockGetOne = jest.fn().mockResolvedValue(null);
      const mockWhere = jest.fn().mockReturnValue({ getOne: mockGetOne });
      mockClosureRepository.createQueryBuilder.mockReturnValue({
        where: mockWhere,
      });

      const result = await repository.checkCycle('child-id', 'parent-id');

      expect(result).toBe(false);
    });
  });

  describe('linkUserToGroup', () => {
    it('should link user to group with closure propagation', async () => {
      await repository.linkUserToGroup('user-id', 'group-id');

      expect(mockDataSource.createQueryRunner).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.manager.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO closure'),
        ['group-id', 'user-id'],
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('getUserOrganizations', () => {
    it('should return user organizations sorted by depth', async () => {
      const mockOrganizations = [
        { id: 'org-3', name: 'Company', depth: 3 },
        { id: 'org-1', name: 'Team', depth: 1 },
        { id: 'org-2', name: 'Department', depth: 2 },
      ];

      mockDataSource.query.mockResolvedValue(mockOrganizations);

      const result = await repository.getUserOrganizations('user-id');

      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('DISTINCT ON'),
        ['user-id'],
      );
      expect(result).toHaveLength(3);
      expect(result[0].depth).toBe(1);
      expect(result[1].depth).toBe(2);
      expect(result[2].depth).toBe(3);
    });
  });
});
