import { SalesSchema, SalesRecordSchema } from '../components/schemas/sales';

export const salesPaths = {
  '/sales': {
    get: {
      tags: ['Sales'],
      summary: 'List sales',
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'outletId',
          in: 'query',
          schema: { type: 'string', format: 'uuid' }
        },
        {
          name: 'salesPersonId',
          in: 'query',
          schema: { type: 'string', format: 'uuid' }
        },
        {
          name: 'status',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['completed', 'returned', 'pending', 'cancelled']
          }
        },
        {
          name: 'startDate',
          in: 'query',
          schema: { type: 'string', format: 'date' }
        },
        {
          name: 'endDate',
          in: 'query',
          schema: { type: 'string', format: 'date' }
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
                    items: { $ref: '#/components/schemas/Sales' }
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
      tags: ['Sales'],
      summary: 'Record sale',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/SalesRecord' }
          }
        }
      },
      responses: {
        201: {
          description: 'Sale recorded',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Sales' }
            }
          }
        }
      }
    }
  },
  '/sales/{id}/status': {
    put: {
      tags: ['Sales'],
      summary: 'Update sale status',
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
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['status'],
              properties: {
                status: {
                  type: 'string',
                  enum: ['completed', 'returned', 'pending', 'cancelled']
                }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Status updated',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Sales' }
            }
          }
        }
      }
    }
  }
};
