import { BusinessSchema, CreateBusinessSchema } from '../components/schemas/business';

export const businessPaths = {
  '/businesses': {
    get: {
      tags: ['Businesses'],
      summary: 'List all businesses',
      description: 'Returns paginated list of businesses (admin only)',
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'status',
          in: 'query',
          description: 'Filter by status',
          schema: {
            type: 'string',
            enum: ['active', 'suspended', 'pending_verification']
          }
        },
        {
          name: 'search',
          in: 'query',
          description: 'Search term for business name/description',
          schema: { type: 'string' }
        }
      ],
      responses: {
        200: {
          description: 'Successful operation',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Business' }
                  },
                  pagination: { $ref: '#/components/schemas/Pagination' }
                }
              }
            }
          }
        }
      }
    },
    post: {
      tags: ['Businesses'],
      summary: 'Create a business',
      description: 'Register a new business (admin only)',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateBusiness' }
          }
        }
      },
      responses: {
        201: {
          description: 'Business created',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Business' }
            }
          }
        }
      }
    }
  },
  '/businesses/{id}': {
    get: {
      tags: ['Businesses'],
      summary: 'Get business by ID',
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' }
        }
      ],
      responses: {
        200: {
          description: 'Successful operation',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Business' }
            }
          }
        }
      }
    },
    put: {
      tags: ['Businesses'],
      summary: 'Update business',
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' }
        }
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateBusiness' }
          }
        }
      },
      responses: {
        200: {
          description: 'Business updated',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Business' }
            }
          }
        }
      }
    },
    delete: {
      tags: ['Businesses'],
      summary: 'Delete business',
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' }
        }
      ],
      responses: {
        204: { description: 'Business deleted' }
      }
    }
  }
};
