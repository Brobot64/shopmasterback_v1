import { TimestampsSchema } from './common';

export const InventorySchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      format: 'uuid'
    },
    status: {
      type: 'string',
      enum: ['pending', 'completed', 'reconciled']
    },
    products: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          productId: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          counted: { type: 'integer' },
          amountInDb: { type: 'integer' },
          reconciled: { type: 'boolean' }
        }
      }
    },
    outletId: { type: 'string', format: 'uuid' },
    actionerId: { type: 'string', format: 'uuid' },
    ...TimestampsSchema
  }
};

export const InventoryRecordSchema = {
  type: 'object',
  required: ['products'],
  properties: {
    products: {
      type: 'array',
      items: {
        type: 'object',
        required: ['productId', 'counted'],
        properties: {
          productId: { type: 'string', format: 'uuid' },
          counted: { type: 'integer', minimum: 0 }
        }
      }
    }
  }
};
