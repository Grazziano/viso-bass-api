import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InteractionService } from './interaction.service';
import { Interaction } from './schema/interaction.schema';
import { CreateInteractionDto } from './dto/create-interaction.dto';
import { VisoObject } from '../viso-object/schema/viso-object.schema';

describe('InteractionService', () => {
  let service: InteractionService;
  let model: Model<Interaction>;
  let mockVisoObjectModel: any;

  const mockInteraction = {
    _id: '507f1f77bcf86cd799439011',
    inter_obj_i: '507f1f77bcf86cd799439011',
    inter_obj_j: '507f1f77bcf86cd799439012',
    inter_start: new Date('2024-01-15T10:30:00.000Z'),
    inter_end: new Date('2024-01-15T10:35:00.000Z'),
    inter_feedback: true,
    inter_service: 1,
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
  };

  const mockCreateInteractionDto: CreateInteractionDto = {
    inter_obj_i: '507f1f77bcf86cd799439011',
    inter_obj_j: '507f1f77bcf86cd799439012',
    inter_start: new Date('2024-01-15T10:30:00.000Z'),
    inter_end: new Date('2024-01-15T10:35:00.000Z'),
    inter_feedback: true,
    inter_service: 1,
  };

  beforeEach(async () => {
    const mockModel = jest.fn().mockImplementation(() => ({
      save: jest.fn(),
    }));

    (mockModel as any).find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn(),
    });
    (mockModel as any).findById = jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn(),
    });
    (mockModel as any).findOne = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn(),
    });
    (mockModel as any).aggregate = jest.fn();
    (mockModel as any).countDocuments = jest.fn().mockReturnValue({
        exec: jest.fn(),
    });

    mockVisoObjectModel = jest.fn();
    mockVisoObjectModel.find = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InteractionService,
        {
          provide: getModelToken(Interaction.name),
          useValue: mockModel,
        },
        {
          provide: getModelToken(VisoObject.name),
          useValue: mockVisoObjectModel,
        },
      ],
    }).compile();

    service = module.get<InteractionService>(InteractionService);
    model = module.get<Model<Interaction>>(getModelToken(Interaction.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and save an interaction successfully', async () => {
      const mockSave = jest.fn().mockResolvedValue(mockInteraction);
      (model as any).mockImplementation(() => ({
        save: mockSave,
      }));

      const result = await service.create(mockCreateInteractionDto);
      expect(result).toEqual(mockInteraction);
    });

    it('should throw error when save fails', async () => {
      const mockSave = jest.fn().mockRejectedValue(new Error('DB error'));
      (model as any).mockImplementation(() => ({
        save: mockSave,
      }));

      await expect(service.create(mockCreateInteractionDto)).rejects.toThrow('Failed to create interaction: DB error');
    });
  });

  describe('findAll', () => {
    it('should return paginated interactions', async () => {
      (model as any).countDocuments().exec.mockResolvedValue(1);
      (model as any).find().exec.mockResolvedValue([mockInteraction]);
      mockVisoObjectModel.find().exec.mockResolvedValue([{ _id: '507f1f77bcf86cd799439011' }]);

      const result = await service.findAll();
      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
    });

    it('should throw error when find fails', async () => {
      (model as any).countDocuments().exec.mockRejectedValue(new Error('DB error'));
      (model as any).find().exec.mockResolvedValue([]);
      await expect(service.findAll()).rejects.toThrow('Failed to find interaction: DB error');
    });
  });

  describe('countInteractionsByDay', () => {
    it('should return interaction count by day', async () => {
      const mockResult = [{ _id: '2024-01-01', total: 5 }];
      (model as any).aggregate.mockResolvedValue(mockResult);

      const result = await service.countInteractionsByDay('week');
      expect(result).toEqual(mockResult);
    });

    it('should throw error when aggregation fails', async () => {
      (model as any).aggregate.mockRejectedValue(new Error('error'));
      await expect(service.countInteractionsByDay('week')).rejects.toThrow('Failed to find interaction: error');
    });
  });

  describe('getTimeSeries', () => {
    it('should return time series data', async () => {
      const mockResult = [{ date: '2024-01-01', interactions: 5 }];
      (model as any).aggregate.mockResolvedValue(mockResult);

      const result = await service.getTimeSeries('7d');
      expect(result).toEqual(mockResult);
    });

    it('should throw error when aggregation fails', async () => {
      (model as any).aggregate.mockRejectedValue(new Error('error'));
      await expect(service.getTimeSeries('7d')).rejects.toThrow('Failed to find interaction: error');
    });
  });

  describe('countInteractions', () => {
    it('should return total count', async () => {
      (model as any).countDocuments().exec.mockResolvedValue(10);
      const result = await service.countInteractions();
      expect(result.total).toBe(10);
    });

    it('should throw error when countDocuments fails', async () => {
      (model as any).countDocuments().exec.mockRejectedValue(new Error('error'));
      await expect(service.countInteractions()).rejects.toThrow('Failed to count interactions: error');
    });
  });

  describe('findLast', () => {
    it('should return last interaction', async () => {
      (model as any).findOne().exec.mockResolvedValue(mockInteraction);
      const result = await service.findLast();
      expect(result).toEqual(mockInteraction);
    });
  });

  describe('findOne', () => {
    it('should return interaction by id', async () => {
      (model as any).findById().exec.mockResolvedValue(mockInteraction);
      const result = await service.findOne('id');
      expect(result).toEqual(mockInteraction);
    });

    it('should throw error when findById fails', async () => {
      (model as any).findById().exec.mockRejectedValue(new Error('error'));
      await expect(service.findOne('id')).rejects.toThrow('Failed to find interaction: error');
    });
  });

  describe('search', () => {
    it('should return search results', async () => {
      mockVisoObjectModel.find().exec.mockResolvedValue([{ _id: '507f1f77bcf86cd799439011' }]);

      (model as any).countDocuments().exec.mockResolvedValue(1);
      (model as any).find().exec.mockResolvedValue([mockInteraction]);

      const result = await service.search({ name: 'test' });
      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
    });

    it('should throw error when search fails', async () => {
      mockVisoObjectModel.find().exec.mockRejectedValue(new Error('error'));

      await expect(service.search({ name: 'test' })).rejects.toThrow('Failed to search interactions: error');
    });
  });
});
