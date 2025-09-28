import { UserRole, UserStatus } from '../../../database/entities/User';
import { TimestampsSchema } from './common';

export const UserSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      format: 'uuid',
      example: '3fa85f64-5717-4562-b3fc-2c963f66afa6'
    },
    firstName: {
      type: 'string',
      example: 'John'
    },
    lastName: {
      type: 'string',
      example: 'Doe'
    },
    email: {
      type: 'string',
      format: 'email',
      example: 'user@shopmaster.com'
    },
    phone: {
      type: 'string',
      example: '+1234567890'
    },
    userType: {
      type: 'string',
      enum: Object.values(UserRole),
      example: UserRole.OWNER
    },
    status: {
      type: 'string',
      enum: Object.values(UserStatus),
      example: UserStatus.ACTIVE
    },
    businessId: {
      type: 'string',
      format: 'uuid',
      example: '3fa85f64-5717-4562-b3fc-2c963f66afa6'
    },
    outletId: {
      type: 'string',
      format: 'uuid',
      example: '3fa85f64-5717-4562-b3fc-2c963f66afa6'
    },
    lastLogin: {
      type: 'string',
      format: 'date-time'
    },
    ...TimestampsSchema
  }
};

export const RegisterUserSchema = {
  type: 'object',
  required: ['firstName', 'lastName', 'email', 'password'],
  properties: {
    firstName: {
      type: 'string',
      example: 'John'
    },
    lastName: {
      type: 'string',
      example: 'Doe'
    },
    email: {
      type: 'string',
      format: 'email',
      example: 'user@shopmaster.com'
    },
    phone: {
      type: 'string',
      example: '+1234567890'
    },
    password: {
      type: 'string',
      format: 'password',
      minLength: 8,
      example: 'strongPassword123'
    }
  }
};
