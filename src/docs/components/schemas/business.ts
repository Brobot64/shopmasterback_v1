import { TimestampsSchema } from './common';

export const BusinessSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      format: 'uuid'
    },
    name: {
      type: 'string',
      example: 'ShopMaster HQ'
    },
    category: {
      type: 'string',
      example: 'Retail'
    },
    description: {
      type: 'string',
      example: 'Leading retail management solution'
    },
    address: {
      type: 'string',
      example: '123 Business St, Commerce City'
    },
    email: {
      type: 'string',
      format: 'email',
      example: 'contact@shopmaster.com'
    },
    imageUrl: {
      type: 'string',
      example: 'https://example.com/business.jpg'
    },
    status: {
      type: 'string',
      enum: ['active', 'suspended', 'pending_verification'],
      example: 'active'
    },
    activeSubStatus: {
      type: 'boolean',
      example: true
    },
    nextSubRenewal: {
      type: 'string',
      format: 'date-time'
    },
    ownerId: {
      type: 'string',
      format: 'uuid'
    },
    ...TimestampsSchema
  }
};

export const CreateBusinessSchema = {
  type: 'object',
  required: ['name', 'category', 'address'],
  properties: {
    name: {
      type: 'string',
      example: 'ShopMaster HQ'
    },
    category: {
      type: 'string',
      example: 'Retail'
    },
    description: {
      type: 'string',
      example: 'Leading retail management solution'
    },
    address: {
      type: 'string',
      example: '123 Business St, Commerce City'
    },
    imageUrl: {
      type: 'string',
      example: 'https://example.com/business.jpg'
    }
  }
};
