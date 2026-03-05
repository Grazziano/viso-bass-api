import { Test, TestingModule } from '@nestjs/testing';
import { VisoClassService } from './viso-class.service';
import { getModelToken } from '@nestjs/mongoose';
import { VisoClass } from './schemas/viso-class.schema';
import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateVisoClassDto } from './dto/create-viso-class.dto';
import { isValidObjectId } from 'mongoose';

// Mock mongoose isValidObjectId
jest.mock('mongoose', () => ({
  ...jest.requireActual('mongoose'),
  isValidObjectId: jest.fn(),
}));

describe('VisoClassService', () => {
  let service: VisoClassService;
  let mockVisoClassModel: any;

  const mockVisoClass = {
    _id: '507f1f77bcf86cd799439011',
    class_name: 'Test Class',
    class_function: ['sensor', 'actuator'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // mockVisoClassResponseDto removed (unused) - tests use mockVisoClass directly

  beforeEach(async () => {
    mockVisoClassModel = jest.fn().mockImplementation(() => ({
      save: jest.fn(),
    }));
    mockVisoClassModel.find = jest.fn();
    mockVisoClassModel.findById = jest.fn();
    mockVisoClassModel.countDocuments = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(0),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisoClassService,
        {
          provide: getModelToken(VisoClass.name),
          useValue: mockVisoClassModel,
        },
      ],
    }).compile();

    service = module.get<VisoClassService>(VisoClassService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createVisoClassDto: CreateVisoClassDto = {
      class_name: 'Test Class',
      class_function: ['sensor', 'actuator'],
      objects: ['507f1f77bcf86cd799439012', '507f1f77bcf86cd799439013'],
    };

    it('should create a viso class successfully', async () => {
      (isValidObjectId as jest.Mock).mockReturnValue(true);

      const mockSavedClass = {
        ...mockVisoClass,
        toJSON: jest.fn().mockReturnValue(mockVisoClass),
      };

      const mockSave = jest.fn().mockResolvedValue(mockSavedClass);
      mockVisoClassModel.mockImplementation(() => ({
        save: mockSave,
      }));

      const result = await service.create(createVisoClassDto);

      expect(mockSave).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.class_name).toBe(createVisoClassDto.class_name);
    });

    it('should throw InternalServerErrorException when object ID is invalid', async () => {
      (isValidObjectId as jest.Mock).mockReturnValue(false);

      await expect(service.create(createVisoClassDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should throw InternalServerErrorException when save fails', async () => {
      (isValidObjectId as jest.Mock).mockReturnValue(true);

      const mockSave = jest.fn().mockRejectedValue(new Error('Database error'));
      mockVisoClassModel.mockImplementation(() => ({
        save: mockSave,
      }));

      await expect(service.create(createVisoClassDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated viso classes', async () => {
      const mockClasses = [
        mockVisoClass,
        { ...mockVisoClass, _id: '507f1f77bcf86cd799439014' },
      ];

      const mockCountExec = jest.fn().mockResolvedValue(2);
      const mockExec = jest.fn().mockResolvedValue(mockClasses);
      const mockLean = jest.fn().mockReturnValue({ exec: mockExec });

      mockVisoClassModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: mockLean,
        exec: mockExec,
      });

      mockVisoClassModel.countDocuments = jest
        .fn()
        .mockReturnValue({ exec: mockCountExec });

      const result = await service.findAll();

      expect(mockVisoClassModel.countDocuments).toHaveBeenCalled();
      expect(mockVisoClassModel.find).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.total).toBe(2);
      expect(result.items.length).toBe(2);
    });

    it('should throw InternalServerErrorException when find fails', async () => {
      mockVisoClassModel.find.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockRejectedValue(new Error('Database error')),
        }),
      });

      await expect(service.findAll()).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findOne', () => {
    const validId = '507f1f77bcf86cd799439011';
    const invalidId = 'invalid-id';

    it('should return a viso class by id', async () => {
      (isValidObjectId as jest.Mock).mockReturnValue(true);

      mockVisoClassModel.findById.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockVisoClass),
        }),
      });

      const result = await service.findOne(validId);

      expect(mockVisoClassModel.findById).toHaveBeenCalledWith({
        _id: validId,
      });
      expect(result).toBeDefined();
      expect(result.class_name).toBe(mockVisoClass.class_name);
    });

    it('should throw NotFoundException when id is invalid', async () => {
      (isValidObjectId as jest.Mock).mockReturnValue(false);

      await expect(service.findOne(invalidId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when viso class is not found', async () => {
      (isValidObjectId as jest.Mock).mockReturnValue(true);

      mockVisoClassModel.findById.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(service.findOne(validId)).rejects.toThrow(NotFoundException);
    });

    it('should throw InternalServerErrorException when findById fails', async () => {
      (isValidObjectId as jest.Mock).mockReturnValue(true);

      mockVisoClassModel.findById.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockRejectedValue(new Error('Database error')),
        }),
      });

      await expect(service.findOne(validId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
