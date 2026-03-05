import { Test, TestingModule } from '@nestjs/testing';
import { OwnersService } from './owners.service';
import { getModelToken } from '@nestjs/mongoose';
import { Owner } from './schema/owner.schema';
import * as bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

describe('OwnersService', () => {
  let service: OwnersService;
  let model: any;

  const mockOwner = {
    _id: '60d5ecb8b392d30d3c9b0b3a',
    name: 'Test User',
    email: 'test@example.com',
    role: 'user',
  };

  beforeEach(async () => {
    model = {
      findOne: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndRemove: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OwnersService,
        {
          provide: getModelToken(Owner.name),
          useValue: model,
        },
      ],
    }).compile();

    service = module.get<OwnersService>(OwnersService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw BadRequestException when email or password missing', async () => {
      await expect(service.create({} as any)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('should throw ConflictException when owner already exists', async () => {
      model.findOne.mockReturnValue({ exec: () => Promise.resolve({ email: 'gandalf.o.cinzento@example.com' }) });

      await expect(
        service.create({
          email: 'gandalf.o.cinzento@example.com',
          password: 'StrongP@ss123!',
        } as any),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('should create and return the saved owner', async () => {
      (jest.spyOn(bcrypt, 'hash') as unknown as jest.Mock).mockResolvedValue(
        'DevMock_2025',
      );

      const savedUser = {
        email: 'portador.do.anel@condado.com',
        _id: 'id',
        password: 'DevMock_2025',
      };

      const saveMock = jest.fn().mockResolvedValue(savedUser);

      // Define a class-like function that returns an object with a save method
      function MockModel(dto: any) {
        this.data = dto;
        this.save = saveMock;
      }
      MockModel.findOne = model.findOne;

      service['ownerModel'] = MockModel as any;

      model.findOne.mockReturnValue({
        exec: () => Promise.resolve(null),
      });

      const result = await service.create({
        email: 'portador.do.anel@condado.com',
        password: 'StrongP@ss123!',
      } as any);

      expect(saveMock).toHaveBeenCalled();
      expect(result).toBe(savedUser);
      expect(bcrypt.hash).toHaveBeenCalledWith('StrongP@ss123!', 10);
    });

    it('should throw InternalServerErrorException when save fails', async () => {
      (jest.spyOn(bcrypt, 'hash') as unknown as jest.Mock).mockResolvedValue(
        'DevMock_2025',
      );

      const saveMock = jest.fn().mockRejectedValue(new Error('fail'));

      function MockModel(dto: any) {
        this.data = dto;
        this.save = saveMock;
      }
      MockModel.findOne = model.findOne;

      service['ownerModel'] = MockModel as any;

      model.findOne.mockReturnValue({
        exec: () => Promise.resolve(null),
      });

      await expect(
        service.create({
          email: 'boromir.caiu@gondor.com',
          password: 'StrongP@ss123!',
        } as any),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });

  describe('findByEmail', () => {
    it('should return owner when found', async () => {
      model.findOne.mockReturnValue({ exec: () => Promise.resolve(mockOwner) });

      const result = await service.findByEmail('gimli.filho.de.gloin@montanha.com');
      expect(result).toBe(mockOwner);

      expect(model.findOne).toHaveBeenCalledWith({ email: 'gimli.filho.de.gloin@montanha.com' });
    });

    it('should throw InternalServerErrorException on db error', async () => {
      model.findOne.mockReturnValue({ exec: () => Promise.reject(new Error('fail')) });

      await expect(
        service.findByEmail('gimli.filho.de.gloin@montanha.com'),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });

  describe('findAll', () => {
    it('should return all owners', async () => {
      model.find.mockReturnValue({ select: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([mockOwner]) }) });
      const result = await service.findAll();
      expect(result).toEqual([mockOwner]);
    });

    it('should throw InternalServerErrorException on error', async () => {
      model.find.mockReturnValue({ select: jest.fn().mockReturnValue({ exec: jest.fn().mockRejectedValue(new Error('DB Error')) }) });
      await expect(service.findAll()).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('updateRole', () => {
    it('should update owner role', async () => {
      model.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockOwner) });
      const result = await service.updateRole('some-id', 'admin');
      expect(result).toEqual(mockOwner);
    });

    it('should throw BadRequestException if owner not found', async () => {
      model.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      await expect(service.updateRole('some-id', 'admin')).rejects.toThrow(BadRequestException);
    });

    it('should throw InternalServerErrorException on error', async () => {
      model.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockRejectedValue(new Error('DB Error')) });
      await expect(service.updateRole('some-id', 'admin')).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('searchUsers', () => {
    it('should call findAll if query is empty', async () => {
      const findAllSpy = jest.spyOn(service, 'findAll').mockResolvedValue([mockOwner] as any);
      const result = await service.searchUsers('');
      expect(findAllSpy).toHaveBeenCalled();
      expect(result).toEqual([mockOwner]);
    });

    it('should return owners matching query', async () => {
      model.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([mockOwner]),
        }),
      });
      const result = await service.searchUsers('test');
      expect(model.find).toHaveBeenCalledWith({
        $or: [{ name: expect.any(RegExp) }, { email: expect.any(RegExp) }],
      });
      expect(result).toEqual([mockOwner]);
    });

    it('should throw InternalServerErrorException on error', async () => {
      model.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockRejectedValue(new Error('DB Error')),
        }),
      });
      await expect(service.searchUsers('test')).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('updateMe', () => {
    const validId = '507f1f77bcf86cd799439011';

    it('should throw BadRequestException if id is invalid', async () => {
      await expect(service.updateMe('', {})).rejects.toThrow(BadRequestException);
      await expect(service.updateMe('invalid-id', {})).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if no fields provided', async () => {
      await expect(service.updateMe(validId, {})).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if email is already in use', async () => {
      model.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ _id: 'other-id' }) });
      await expect(service.updateMe(validId, { email: 'used@example.com' })).rejects.toThrow(ConflictException);
    });

    it('should update and return user', async () => {
      model.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      model.findByIdAndUpdate.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue({
              _id: new Types.ObjectId(validId),
              name: 'Updated Name',
              email: 'updated@example.com',
              role: 'user',
            }),
          }),
        }),
      });

      const result = await service.updateMe(validId, { name: 'Updated Name' });
       expect((result as any)._id).toBe(validId);
       expect(result.name).toBe('Updated Name');
     });

    it('should throw InternalServerErrorException on error', async () => {
      model.findOne.mockReturnValue({ exec: jest.fn().mockRejectedValue(new Error('DB Error')) });
      await expect(service.updateMe(validId, { name: 'Name' })).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('changePassword', () => {
    const validId = '507f1f77bcf86cd799439011';

    it('should throw BadRequestException if user not found', async () => {
      model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      await expect(service.changePassword(validId, 'old', 'new')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if current password does not match', async () => {
      model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue({ password: 'hashed' }) });
      (jest.spyOn(bcrypt, 'compare') as jest.Mock).mockResolvedValue(false);
      await expect(service.changePassword(validId, 'wrong', 'new')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if new password is weak', async () => {
      model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue({ password: 'hashed', name: 'User', email: 'test@test.com' }) });
      (jest.spyOn(bcrypt, 'compare') as jest.Mock).mockResolvedValue(true);
      // Weak password "123"
      await expect(service.changePassword(validId, 'old', '123')).rejects.toThrow(BadRequestException);
    });

    it('should update password and return user', async () => {
      model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue({ password: 'hashed', name: 'User', email: 'test@test.com' }) });
      (jest.spyOn(bcrypt, 'compare') as jest.Mock).mockResolvedValue(true);
      (jest.spyOn(bcrypt, 'hash') as jest.Mock).mockResolvedValue('new-hashed');
      model.findByIdAndUpdate.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockOwner),
        }),
      });

      const result = await service.changePassword(validId, 'old', 'StrongP@ss123!');
      expect(result).toEqual(mockOwner);
    });

    it('should throw InternalServerErrorException if update fails', async () => {
      model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue({ password: 'hashed', name: 'User', email: 'test@test.com' }) });
      (jest.spyOn(bcrypt, 'compare') as jest.Mock).mockResolvedValue(true);
      (jest.spyOn(bcrypt, 'hash') as jest.Mock).mockResolvedValue('new-hashed');
      model.findByIdAndUpdate.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(service.changePassword(validId, 'old', 'StrongP@ss123!')).rejects.toThrow(InternalServerErrorException);
    });
  });
});
