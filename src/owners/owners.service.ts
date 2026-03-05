import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Owner, OwnerDocument } from './schema/owner.schema';
import { IOwner } from './interfaces/owner.interface';

@Injectable()
export class OwnersService {
  private readonly logger = new Logger(OwnersService.name);

  constructor(
    @InjectModel(Owner.name) private ownerModel: Model<OwnerDocument>,
  ) {}

  private isWeakPassword(pwd: string, name?: string, email?: string) {
    const minLen = 8;
    const hasUpper = /[A-Z]/.test(pwd);
    const hasLower = /[a-z]/.test(pwd);
    const hasDigit = /\d/.test(pwd);
    const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
    const common = [
      '123456',
      '12345678',
      '123456789',
      'password',
      'qwerty',
      'abc123',
      'senha',
      'admin',
      '000000',
      '111111',
      'letmein',
    ];
    const normalized = pwd.toLowerCase();
    const hasCommon = common.includes(normalized);
    const hasRepeat = /^([a-zA-Z0-9])\1{3,}$/.test(pwd);
    const nameNorm = (name ?? '').toLowerCase().replace(/\s+/g, '');
    const emailLocal = (email ?? '').toLowerCase().split('@')[0] ?? '';
    const containsPII =
      (nameNorm && nameNorm.length >= 3 && normalized.includes(nameNorm)) ||
      (emailLocal && emailLocal.length >= 3 && normalized.includes(emailLocal));
    return !(
      pwd.length >= minLen &&
      hasUpper &&
      hasLower &&
      hasDigit &&
      hasSpecial &&
      !hasCommon &&
      !hasRepeat &&
      !containsPII
    );
  }

  async create(body: IOwner): Promise<Owner> {
    this.logger.log(`Tentativa de criação de usuário: ${String(body.email)}`);

    if (!body.email || !body.password) {
      this.logger.warn(
        `Tentativa de criação de usuário com dados incompletos: ${String(body.email)}`,
      );
      throw new BadRequestException('Email e senha são obrigatórios');
    }

    if (this.isWeakPassword(body.password, body.name, body.email)) {
      throw new BadRequestException(
        'Senha fraca. Use no mínimo 8 caracteres com maiúsculas, minúsculas, números e símbolo; não use dados pessoais nem sequências repetidas.',
      );
    }

    try {
      const ownerExists = await this.findByEmail(body.email);

      if (ownerExists) {
        this.logger.warn(
          `Tentativa de criação de usuário já existente: ${String(body.email)}`,
        );
        throw new ConflictException('Usuário ja cadastrado');
      }

      const hash = await bcrypt.hash(body.password, 10);

      const user = new this.ownerModel({
        ...body,
        password: hash,
      });

      const savedUser = await user.save();
      this.logger.log(
        `Usuário criado com sucesso: ${String(savedUser.email)} (ID: ${String(
          savedUser._id,
        )})`,
      );

      return savedUser;
    } catch (error: unknown) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(
        `Erro ao processar cadastro para ${String(body.email)}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException('Erro ao processar cadastro');
    }
  }

  async findByEmail(email: string): Promise<Owner | null> {
    this.logger.debug(`Buscando usuário por email: ${email}`);

    try {
      const owner = await this.ownerModel.findOne({ email }).exec();

      if (owner) {
        this.logger.debug(`Usuário encontrado: ${email}`);
      } else {
        this.logger.debug(`Usuário não encontrado: ${email}`);
      }

      return owner;
    } catch (error) {
      this.logger.error(
        `Erro ao buscar usuário por email ${email}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException('Erro ao buscar usuário');
    }
  }

  async findAll(): Promise<Omit<Owner, 'password'>[]> {
    this.logger.debug('Listando todos os usuários');
    try {
      const owners = await this.ownerModel.find({}).select('-password').exec();
      return owners as unknown as Omit<Owner, 'password'>[];
    } catch (error) {
      this.logger.error(
        `Erro ao listar usuários: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException('Erro ao listar usuários');
    }
  }

  async updateRole(id: string, role: string): Promise<Omit<Owner, 'password'>> {
    this.logger.debug(`Atualizando papel do usuário ${id} para ${role}`);
    try {
      const updated = await this.ownerModel
        .findByIdAndUpdate(
          id,
          { $set: { role } },
          { new: true, projection: { password: 0 } },
        )
        .exec();
      if (!updated) {
        throw new BadRequestException('Usuário não encontrado');
      }
      return updated as unknown as Omit<Owner, 'password'>;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Erro ao atualizar papel do usuário ${id}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(
        'Erro ao atualizar papel do usuário',
      );
    }
  }

  async searchUsers(q: string): Promise<Omit<Owner, 'password'>[]> {
    this.logger.debug(`Buscando usuários por termo: ${q}`);
    try {
      if (!q || q.trim().length === 0) {
        return this.findAll();
      }
      const regex = new RegExp(q, 'i');
      const owners = await this.ownerModel
        .find({
          $or: [{ name: regex }, { email: regex }],
        })
        .select('-password')
        .exec();
      return owners as unknown as Omit<Owner, 'password'>[];
    } catch (error) {
      this.logger.error(
        `Erro na busca por usuários: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException('Erro ao buscar usuários');
    }
  }

  async updateMe(
    id: string,
    updates: { name?: string; email?: string },
  ): Promise<Omit<Owner, 'password'>> {
    this.logger.debug(
      `Atualizando perfil do usuário ${id} (tipo: ${typeof id}, length: ${id?.length})`,
    );
    try {
      // Validar e converter o ID para ObjectId
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        this.logger.warn(`ID inválido recebido: ${id}`);
        throw new BadRequestException(
          'ID de usuário inválido: ID não fornecido ou vazio',
        );
      }

      if (!Types.ObjectId.isValid(id)) {
        this.logger.warn(`ID não é um ObjectId válido: ${id}`);
        throw new BadRequestException(
          `ID de usuário inválido: formato incorreto (recebido: ${id})`,
        );
      }
      const objectId = new Types.ObjectId(id);

      const set: Record<string, unknown> = {};
      if (typeof updates.name === 'string' && updates.name.trim().length > 0) {
        set.name = updates.name.trim();
      }
      if (
        typeof updates.email === 'string' &&
        updates.email.trim().length > 0
      ) {
        const emailTrimmed = updates.email.trim();
        const exists = await this.ownerModel
          .findOne({ email: emailTrimmed, _id: { $ne: objectId } })
          .exec();
        if (exists) {
          throw new ConflictException('Email já está em uso');
        }
        set.email = emailTrimmed;
      }

      // Verificar se há campos para atualizar
      if (Object.keys(set).length === 0) {
        throw new BadRequestException(
          'Nenhum campo fornecido para atualização. Forneça pelo menos um campo (name ou email).',
        );
      }

      const updated = await this.ownerModel
        .findByIdAndUpdate(objectId, { $set: set }, { new: true })
        .select('-password')
        .lean()
        .exec();
      if (!updated) {
        throw new BadRequestException('Usuário não encontrado');
      }
      // Converter para objeto simples removendo campos do Mongoose
      const updatedDoc = updated as Record<string, unknown>;
      const idValue = updatedDoc._id;
      const idString =
        idValue instanceof Types.ObjectId
          ? idValue.toString()
          : typeof idValue === 'string'
            ? idValue
            : String(idValue);
      const result = {
        _id: idString,
        name: updatedDoc.name as string,
        email: updatedDoc.email as string,
        role: updatedDoc.role as string,
        createdAt: updatedDoc.createdAt,
        updatedAt: updatedDoc.updatedAt,
      };
      return result as unknown as Omit<Owner, 'password'>;
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      // Log detalhado do erro para debug
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Erro ao atualizar perfil do usuário ${id}: ${errorMessage}`,
        errorStack,
      );
      // Incluir mais informações no erro para debug
      throw new InternalServerErrorException(
        `Erro ao atualizar perfil: ${errorMessage}`,
      );
    }
  }

  async changePassword(
    id: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<Omit<Owner, 'password'>> {
    this.logger.debug(`Atualizando senha do usuário ${id}`);
    try {
      const user = await this.ownerModel.findById(id).exec();
      if (!user) {
        throw new BadRequestException('Usuário não encontrado');
      }
      const match = await bcrypt.compare(currentPassword, user.password);
      if (!match) {
        throw new BadRequestException('Senha atual incorreta');
      }
      if (this.isWeakPassword(newPassword, user.name, user.email)) {
        throw new BadRequestException(
          'Senha fraca. Use no mínimo 8 caracteres com maiúsculas, minúsculas, números e símbolo; não use dados pessoais nem sequências repetidas.',
        );
      }
      const hash = await bcrypt.hash(newPassword, 10);
      const updated = await this.ownerModel
        .findByIdAndUpdate(id, { $set: { password: hash } }, { new: true })
        .select('-password')
        .exec();
      if (!updated) {
        throw new InternalServerErrorException('Erro ao atualizar senha');
      }
      return updated as unknown as Omit<Owner, 'password'>;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Erro ao atualizar senha do usuário ${id}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException('Erro ao atualizar senha');
    }
  }
}
