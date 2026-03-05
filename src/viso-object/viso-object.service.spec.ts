import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { VisoObjectService } from './viso-object.service';
import { VisoObject } from './schema/viso-object.schema';
import { CreateVisoObjectDto } from './dto/create-viso-object.dto';
import { ResponseVisoObjectDto } from './dto/response-viso-object.dto';
import { JwtPayload } from '../auth/types/jwt-payload.interface';

describe('VisoObjectService', () => {
  let service: VisoObjectService;
  let model: Model<VisoObject>;

  const mockUser: JwtPayload = {
    userId: '507f1f77bcf86cd799439011',
    email: 'test@example.com',
  };

  const mockVisoObject = {
    _id: '507f1f77bcf86cd799439012',
    obj_networkMAC: '00:11:22:33:44:55',
    obj_name: 'Test Object',
    obj_model: 'Model X',
    obj_brand: 'Brand Y',
    obj_function: 'sensor',
    obj_restriction: 'none',
    obj_limitation: ['battery'],
    obj_access: 1,
    obj_location: 101,
    obj_qualification: 1,
    obj_status: 1,
    obj_owner: '507f1f77bcf86cd799439011',
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
  };

  const mockCreateVisoObjectDto: CreateVisoObjectDto = {
    obj_networkMAC: '00:11:22:33:44:55',
    obj_name: 'Test Object',
    obj_model: 'Model X',
    obj_brand: 'Brand Y',
    obj_function: ['sensor'],
    obj_restriction: ['none'],
    obj_limitation: ['battery'],
    obj_access: 1,
    obj_location: 101,
    obj_qualification: 1,
    obj_status: 1,
  };

  beforeEach(async () => {
    const mockModel = jest.fn().mockImplementation(() => ({
      save: jest.fn(),
    }));
    (mockModel as any).find = jest.fn();
    (mockModel as any).findById = jest.fn();
    (mockModel as any).countDocuments = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(0),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisoObjectService,
        {
          provide: getModelToken(VisoObject.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    service = module.get<VisoObjectService>(VisoObjectService);
    model = module.get<Model<VisoObject>>(getModelToken(VisoObject.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create and save a viso object successfully', async () => {
      // Arrange
      const mockSave = jest.fn().mockResolvedValue({
        ...mockVisoObject,
        toJSON: jest.fn().mockReturnValue(mockVisoObject),
      });
      const mockConstructor = jest.fn().mockImplementation(() => ({
        save: mockSave,
      }));

      (model as any).mockImplementation(mockConstructor);

      // Act
      const result = await service.create(mockCreateVisoObjectDto, mockUser);

      // Assert
      expect(mockConstructor).toHaveBeenCalledWith({
        ...mockCreateVisoObjectDto,
        obj_owner: mockUser.userId,
      });
      expect(mockSave).toHaveBeenCalled();
      expect(result).toBeInstanceOf(ResponseVisoObjectDto);
    });

    it('should throw InternalServerErrorException when save fails', async () => {
      // Arrange
      const error = new Error('Database error');
      const mockSave = jest.fn().mockRejectedValue(error);
      const mockConstructor = jest.fn().mockImplementation(() => ({
        save: mockSave,
      }));

      (model as any).mockImplementation(mockConstructor);

      // Act & Assert
      await expect(
        service.create(mockCreateVisoObjectDto, mockUser),
      ).rejects.toThrow(InternalServerErrorException);
      await expect(
        service.create(mockCreateVisoObjectDto, mockUser),
      ).rejects.toThrow('Failed to create object: Database error');
    });
  });

  describe('findAll', () => {
    it('should return all viso objects with pagination', async () => {
      // Arrange
      const mockObjects = [mockVisoObject];
      const mockCountExec = jest.fn().mockResolvedValue(1);
      const mockExec = jest.fn().mockResolvedValue(mockObjects);
      const mockLean = jest.fn().mockReturnValue({ exec: mockExec });

      (model as any).find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: mockLean,
        exec: mockExec,
      });
      (model as any).countDocuments = jest
        .fn()
        .mockReturnValue({ exec: mockCountExec });

      // Act
      const result = await service.findAll();

      // Assert
      expect((model as any).countDocuments).toHaveBeenCalled();
      expect((model as any).find).toHaveBeenCalled();
      expect(mockLean).toHaveBeenCalled();
      expect(mockExec).toHaveBeenCalled();
      expect(result.total).toBe(1);
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toBeInstanceOf(ResponseVisoObjectDto);
      expect(result.page).toBe(1);
      expect(result.limit).toBeGreaterThan(0);
    });

    it('should return empty array when no objects exist', async () => {
      // Arrange
      const mockCountExec = jest.fn().mockResolvedValue(0);
      const mockExec = jest.fn().mockResolvedValue([]);
      const mockLean = jest.fn().mockReturnValue({ exec: mockExec });

      (model as any).find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: mockLean,
        exec: mockExec,
      });
      (model as any).countDocuments = jest
        .fn()
        .mockReturnValue({ exec: mockCountExec });

      // Act
      const result = await service.findAll();

      // Assert
      expect((model as any).countDocuments).toHaveBeenCalled();
      expect((model as any).find).toHaveBeenCalled();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should throw InternalServerErrorException when find fails', async () => {
      // Arrange
      const error = new Error('Database error');
      const mockCountExec = jest.fn().mockResolvedValue(1);
      const mockExec = jest.fn().mockRejectedValue(error);
      const mockLean = jest.fn().mockReturnValue({ exec: mockExec });

      (model as any).find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: mockLean,
        exec: mockExec,
      });
      (model as any).countDocuments = jest
        .fn()
        .mockReturnValue({ exec: mockCountExec });

      // Act & Assert
      await expect(service.findAll()).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.findAll()).rejects.toThrow(
        'Failed to find objects: Database error',
      );
    });
  });

  describe('findOne', () => {
    it('should return a single viso object by id', async () => {
      // Arrange
      const id = '507f1f77bcf86cd799439012';
      const mockExec = jest.fn().mockResolvedValue(mockVisoObject);
      const mockLean = jest.fn().mockReturnValue({ exec: mockExec });

      model.findById = jest.fn().mockReturnValue({ lean: mockLean });

      // Act
      const result = await service.findOne(id);

      // Assert
      expect(model.findById).toHaveBeenCalledWith(id);
      expect(mockLean).toHaveBeenCalled();
      expect(mockExec).toHaveBeenCalled();
      expect(result).toBeInstanceOf(ResponseVisoObjectDto);
    });

    it('should throw NotFoundException when object is not found', async () => {
      // Arrange
      const id = 'nonexistent-id';
      const mockExec = jest.fn().mockResolvedValue(null);
      const mockLean = jest.fn().mockReturnValue({ exec: mockExec });

      model.findById = jest.fn().mockReturnValue({ lean: mockLean });

      // Act & Assert
      await expect(service.findOne(id)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(id)).rejects.toThrow(
        `Object with id ${id} not found`,
      );
    });

    it('should throw InternalServerErrorException when findById fails', async () => {
      // Arrange
      const id = '507f1f77bcf86cd799439012';
      const error = new Error('Database error');
      const mockExec = jest.fn().mockRejectedValue(error);
      const mockLean = jest.fn().mockReturnValue({ exec: mockExec });

      model.findById = jest.fn().mockReturnValue({ lean: mockLean });

      // Act & Assert
      await expect(service.findOne(id)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.findOne(id)).rejects.toThrow(
        'Failed to find object: Database error',
      );
    });

    it('should re-throw NotFoundException without wrapping', async () => {
      // Arrange
      const id = 'nonexistent-id';
      const mockExec = jest.fn().mockResolvedValue(null);
      const mockLean = jest.fn().mockReturnValue({ exec: mockExec });

      model.findById = jest.fn().mockReturnValue({ lean: mockLean });

      // Act & Assert
      await expect(service.findOne(id)).rejects.toThrow(NotFoundException);
      expect(model.findById).toHaveBeenCalledWith(id);
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
