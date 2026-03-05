import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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
    obj_function: ['sensor'],
    obj_restriction: ['none'],
    obj_limitation: ['battery'],
    obj_access: 1,
    obj_location: 101,
    obj_qualification: 1,
    obj_status: 1,
    obj_owner: '507f1f77bcf86cd799439011',
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
    toJSON: function() {
        return {
            _id: this._id,
            obj_networkMAC: this.obj_networkMAC,
            obj_name: this.obj_name,
            obj_model: this.obj_model,
            obj_brand: this.obj_brand,
            obj_function: this.obj_function,
            obj_restriction: this.obj_restriction,
            obj_limitation: this.obj_limitation,
            obj_access: this.obj_access,
            obj_location: this.obj_location,
            obj_qualification: this.obj_qualification,
            obj_status: this.obj_status,
            obj_owner: this.obj_owner,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
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
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    });
    (mockModel as any).countDocuments = jest.fn().mockReturnValue({
      exec: jest.fn(),
    });
    (mockModel as any).aggregate = jest.fn().mockReturnValue({
      exec: jest.fn(),
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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and save a viso object successfully', async () => {
      const mockSave = jest.fn().mockResolvedValue(mockVisoObject);
      const mockConstructor = jest.fn().mockImplementation(() => ({
        save: mockSave,
      }));
      (model as any).mockImplementation(mockConstructor);

      const result = await service.create(mockCreateVisoObjectDto, mockUser);

      expect(mockConstructor).toHaveBeenCalled();
      expect(mockSave).toHaveBeenCalled();
      expect(result).toBeInstanceOf(ResponseVisoObjectDto);
    });

    it('should throw InternalServerErrorException when save fails', async () => {
      const mockSave = jest.fn().mockRejectedValue(new Error('DB error'));
      const mockConstructor = jest.fn().mockImplementation(() => ({
        save: mockSave,
      }));
      (model as any).mockImplementation(mockConstructor);

      await expect(service.create(mockCreateVisoObjectDto, mockUser)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('findAll', () => {
    it('should return paginated objects', async () => {
      (model as any).countDocuments().exec.mockResolvedValue(1);
      (model as any).find().exec.mockResolvedValue([mockVisoObject]);

      const result = await service.findAll();
      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
    });

    it('should throw InternalServerErrorException on error', async () => {
      (model as any).countDocuments().exec.mockRejectedValue(new Error('DB error'));
      await expect(service.findAll()).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('findOne', () => {
    it('should return an object by id', async () => {
      (model as any).findById().exec.mockResolvedValue(mockVisoObject);

      const result = await service.findOne('id');
      expect(result).toBeInstanceOf(ResponseVisoObjectDto);
    });

    it('should throw NotFoundException if not found', async () => {
      (model as any).findById().exec.mockResolvedValue(null);

      await expect(service.findOne('id')).rejects.toThrow(NotFoundException);
    });

    it('should throw InternalServerErrorException on error', async () => {
      (model as any).findById().exec.mockRejectedValue(new Error('DB error'));

      await expect(service.findOne('id')).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('search', () => {
    it('should return filtered results', async () => {
      (model as any).countDocuments().exec.mockResolvedValue(1);
      (model as any).find().exec.mockResolvedValue([mockVisoObject]);

      const result = await service.search({ name: 'Test', ownerId: '507f1f77bcf86cd799439011' });
      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
    });

    it('should throw InternalServerErrorException on error', async () => {
      (model as any).countDocuments().exec.mockRejectedValue(new Error('DB error'));
      await expect(service.search({})).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('countObjects', () => {
    it('should return total count', async () => {
      (model as any).countDocuments().exec.mockResolvedValue(10);
      const result = await service.countObjects();
      expect(result.total).toBe(10);
    });

    it('should throw InternalServerErrorException on error', async () => {
      (model as any).countDocuments().exec.mockRejectedValue(new Error('DB error'));
      await expect(service.countObjects()).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('countObjectsByStatus', () => {
    it('should return counts by status', async () => {
      const mockAgg = [{ _id: 1, total: 5 }, { _id: 2, total: 3 }];
      (model as any).aggregate().exec.mockResolvedValue(mockAgg);

      const result = await service.countObjectsByStatus();
      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('online');
    });

    it('should throw InternalServerErrorException on error', async () => {
      (model as any).aggregate().exec.mockRejectedValue(new Error('DB error'));
      await expect(service.countObjectsByStatus()).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('findLast', () => {
    it('should return last object', async () => {
      (model as any).findOne().exec.mockResolvedValue(mockVisoObject);

      const result = await service.findLast();
      expect(result).toEqual(mockVisoObject);
    });
  });
});
