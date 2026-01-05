import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ClosureEntity, NodeEntity } from '@shared/organization-core/entities';
import { DataSource, Repository } from 'typeorm';
import { NodesRepository } from './nodes.repository';

describe('NodesRepository', () => {
  let repository: NodesRepository;
  let nodeRepository: Repository<NodeEntity>;
  let dataSource: DataSource;

  const mockNodeRepository = {
    findOne: jest.fn(),
  };

  const mockDataSource = {
    query: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NodesRepository,
        {
          provide: getRepositoryToken(NodeEntity),
          useValue: mockNodeRepository,
        },
        {
          provide: getRepositoryToken(ClosureEntity),
          useValue: {},
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    repository = module.get<NodesRepository>(NodesRepository);
    nodeRepository = module.get<Repository<NodeEntity>>(
      getRepositoryToken(NodeEntity),
    );
    dataSource = module.get<DataSource>(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findNodeById', () => {
    it('should find node by id', async () => {
      const mockNode = { id: 'node-id', name: 'Test Node' };
      mockNodeRepository.findOne.mockResolvedValue(mockNode);

      const result = await repository.findNodeById('node-id');

      expect(mockNodeRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'node-id' },
      });
      expect(result).toEqual(mockNode);
    });
  });

  describe('getAncestors', () => {
    it('should return ancestors ordered by depth', async () => {
      const mockAncestors = [
        { id: 'anc-1', name: 'Parent', type: 'GROUP', depth: 1 },
        { id: 'anc-2', name: 'Grandparent', type: 'GROUP', depth: 2 },
      ];

      mockDataSource.query.mockResolvedValue(mockAncestors);

      const result = await repository.getAncestors('node-id');

      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE c.descendant = $1 AND c.depth >= 1'),
        ['node-id'],
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'anc-1',
        name: 'Parent',
        depth: 1,
      });
    });

    it('should return empty array if no ancestors', async () => {
      mockDataSource.query.mockResolvedValue([]);

      const result = await repository.getAncestors('root-node');

      expect(result).toEqual([]);
    });
  });

  describe('getDescendants', () => {
    it('should return descendants ordered by depth', async () => {
      const mockDescendants = [
        { id: 'desc-1', name: 'Child', type: 'USER', depth: 1 },
        { id: 'desc-2', name: 'Grandchild', type: 'USER', depth: 2 },
      ];

      mockDataSource.query.mockResolvedValue(mockDescendants);

      const result = await repository.getDescendants('node-id');

      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE c.ancestor = $1 AND c.depth >= 1'),
        ['node-id'],
      );
      expect(result).toHaveLength(2);
      expect(result[0].depth).toBe(1);
      expect(result[1].depth).toBe(2);
    });
  });
});
