import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { WinstonLoggerService } from '@shared/modules/winston/winston-logger.service';
import { NodesRepository } from '../repositories/nodes.repository';
import { NodesService } from './nodes.service';

describe('NodesService', () => {
  let service: NodesService;
  let repository: NodesRepository;
  let logger: WinstonLoggerService;

  const mockNodesRepository = {
    findNodeById: jest.fn(),
    getAncestors: jest.fn(),
    getDescendants: jest.fn(),
  };

  const mockLogger = {
    log: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NodesService,
        {
          provide: NodesRepository,
          useValue: mockNodesRepository,
        },
        {
          provide: WinstonLoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<NodesService>(NodesService);
    repository = module.get<NodesRepository>(NodesRepository);
    logger = module.get<WinstonLoggerService>(WinstonLoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getNodeAncestors', () => {
    it('should return node ancestors', async () => {
      const mockNode = { id: 'node-id', name: 'Node' };
      const mockAncestors = [
        { id: 'anc-1', name: 'Parent', depth: 1 },
        { id: 'anc-2', name: 'Grandparent', depth: 2 },
      ];

      mockNodesRepository.findNodeById.mockResolvedValue(mockNode);
      mockNodesRepository.getAncestors.mockResolvedValue(mockAncestors);

      const result = await service.getNodeAncestors('node-id');

      expect(mockNodesRepository.findNodeById).toHaveBeenCalledWith('node-id');
      expect(mockNodesRepository.getAncestors).toHaveBeenCalledWith('node-id');
      expect(result).toEqual(mockAncestors);
      expect(mockLogger.log).toHaveBeenCalledTimes(2);
    });

    it('should throw NotFoundException if node not found', async () => {
      mockNodesRepository.findNodeById.mockResolvedValue(null);

      await expect(service.getNodeAncestors('non-existent')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Node not found',
        undefined,
        expect.any(Object),
      );
    });
  });

  describe('getNodeDescendants', () => {
    it('should return node descendants', async () => {
      const mockNode = { id: 'node-id', name: 'Node' };
      const mockDescendants = [
        { id: 'desc-1', name: 'Child', depth: 1 },
        { id: 'desc-2', name: 'Grandchild', depth: 2 },
      ];

      mockNodesRepository.findNodeById.mockResolvedValue(mockNode);
      mockNodesRepository.getDescendants.mockResolvedValue(mockDescendants);

      const result = await service.getNodeDescendants('node-id');

      expect(mockNodesRepository.findNodeById).toHaveBeenCalledWith('node-id');
      expect(mockNodesRepository.getDescendants).toHaveBeenCalledWith(
        'node-id',
      );
      expect(result).toEqual(mockDescendants);
    });

    it('should throw NotFoundException if node not found', async () => {
      mockNodesRepository.findNodeById.mockResolvedValue(null);

      await expect(service.getNodeDescendants('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
