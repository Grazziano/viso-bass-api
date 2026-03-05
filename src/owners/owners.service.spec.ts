import { Test, TestingModule } from '@nestjs/testing';
import { OwnersService } from './owners.service';
import { getModelToken } from '@nestjs/mongoose';
import { Owner } from './schema/owner.schema';
import * as bcrypt from 'bcrypt';
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';

describe('OwnersService', () => {
  let service: OwnersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OwnersService,
        {
          provide: getModelToken(Owner.name),
          useValue: {
            findOne: jest.fn(),
          },
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
      // mock findByEmail behavior (ownerModel.findOne().exec())

      service['ownerModel'].findOne = jest.fn().mockReturnValue({
        exec: () =>
          Promise.resolve({ email: 'gandalf.o.cinzento@example.com' }),
      });

      await expect(
        service.create({
          email: 'gandalf.o.cinzento@example.com',
          password: 'StrongP@ss123!',
        } as any),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('should create and return the saved owner', async () => {
      // mock bcrypt.hash
      (jest.spyOn(bcrypt, 'hash') as unknown as jest.Mock).mockResolvedValue(
        'DevMock_2025',
      );

      const savedUser = {
        email: 'portador.do.anel@condado.com',
        _id: 'id',
        password: 'DevMock_2025',
      };

      // make constructor return object with save and provide findOne on the model
      const saveMock = jest.fn().mockResolvedValue(savedUser);
      const modelCtor = jest
        .fn()
        .mockImplementation(() => ({ save: saveMock }));

      (modelCtor as any).findOne = jest
        .fn()
        .mockReturnValue({ exec: () => Promise.resolve(null) });

      service['ownerModel'] = modelCtor as any;

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
      const modelCtor = jest
        .fn()
        .mockImplementation(() => ({ save: saveMock }));

      (modelCtor as any).findOne = jest
        .fn()
        .mockReturnValue({ exec: () => Promise.resolve(null) });

      service['ownerModel'] = modelCtor as any;

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
      const owner = { email: 'gimli.filho.de.gloin@montanha.com' };

      service['ownerModel'].findOne = jest
        .fn()
        .mockReturnValue({ exec: () => Promise.resolve(owner) });

      const result = await service.findByEmail(
        'gimli.filho.de.gloin@montanha.com',
      );
      expect(result).toBe(owner);

      expect(service['ownerModel'].findOne).toHaveBeenCalledWith({
        email: 'gimli.filho.de.gloin@montanha.com',
      });
    });

    it('should throw InternalServerErrorException on db error', async () => {
      service['ownerModel'].findOne = jest
        .fn()
        .mockReturnValue({ exec: () => Promise.reject(new Error('fail')) });

      await expect(
        service.findByEmail('gimli.filho.de.gloin@montanha.com'),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });
});
