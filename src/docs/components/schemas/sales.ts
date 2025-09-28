import { TimestampsSchema } from './common';

export const SalesSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      format: 'uuid'
    },
    totalAmount: {
      type: 'number',
      format: 'float'
    },
    discount: {
      type: 'number',
      format: 'float'
    },
    status: {
      type: 'string',
      enum: ['completed', 'returned', 'pending', 'cancelled']
    },
    paymentChannel: {
      type: 'string',
      enum: ['cash', 'transfer', 'card', 'other']
    },
    customer: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        phone: { type: 'string' },
        email: { type: 'string', format: 'email' },
        address: { type: 'string' }
      }
    },
    salesPersonId: { type: 'string', format: 'uuid' },
    ...TimestampsSchema
  }
};

export const SalesProductSchema = {
  type: 'object',
  properties: {
    productId: { type: 'string', format: 'uuid' },
    quantity: { type: 'integer', minimum: 1 }
  }
};

export const SalesRecordSchema = {
  type: 'object',
  required: ['products', 'amountPaid', 'paymentChannel'],
  properties: {
    products: {
      type: 'array',
      items: { $ref: '#/components/schemas/SalesProduct' }
    },
    discount: { type: 'number', format: 'float', minimum: 0 },
    amountPaid: { type: 'number', format: 'float', minimum: 0 },
    paymentChannel: {
      type: 'string',
      enum: ['cash', 'transfer', 'card', 'other']
    },
    customer: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        phone: { type: 'string' },
        email: { type: 'string', format: 'email' },
        address: { type: 'string' }
      }
    }
  }
};
