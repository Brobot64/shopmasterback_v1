import { TimestampsSchema } from './common';

export const ProductSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      format: 'uuid'
    },
    name: {
      type: 'string',
      example: 'Premium Widget'
    },
    description: {
      type: 'string',
      example: 'High-quality widget for all uses'
    },
    price: {
      type: 'number',
      format: 'float',
      example: 29.99
    },
    quantity: {
      type: 'integer',
      example: 100
    },
    category: {
      type: 'string',
      example: 'Widgets'
    },
    tags: {
      type: 'array',
      items: { type: 'string' },
      example: ['premium', 'bestseller']
    },
    imageUrl: {
      type: 'string',
      example: 'https://example.com/product.jpg'
    },
    status: {
      type: 'string',
      enum: ['available', 'low_stock', 'out_of_stock'],
      example: 'available'
    },
    reOrderPoint: {
      type: 'integer',
      example: 10
    },
    businessId: {
      type: 'string',
      format: 'uuid'
    },
    outletId: {
      type: 'string',
      format: 'uuid'
    },
    ...TimestampsSchema
  }
};

export const CreateProductSchema = {
  type: 'object',
  required: ['name', 'price', 'quantity', 'category'],
  properties: {
    name: {
      type: 'string',
      example: 'Premium Widget'
    },
    description: {
      type: 'string',
      example: 'High-quality widget for all uses'
    },
    price: {
      type: 'number',
      format: 'float',
      minimum: 0,
      example: 29.99
    },
    quantity: {
      type: 'integer',
      minimum: 0,
      example: 100
    },
    category: {
      type: 'string',
      example: 'Widgets'
    },
    imageUrl: {
      type: 'string',
      example: 'https://example.com/product.jpg'
    }
  }
};
