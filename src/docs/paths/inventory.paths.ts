import { InventorySchema, InventoryRecordSchema } from '../components/schemas/inventory';

export const inventoryPaths = {
  '/inventory': {
    get: {
      tags: ['Inventory'],
      summary: 'List inventory records',
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'outletId',
          in: 'query',
          schema: { type: 'string', format: 'uuid' }
        },
        {
          name: 'status',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['pending', 'completed', 'reconciled']
          }
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
                    items: { $ref: '#/components/schemas/Inventory' }
                  },
                  pagination: { $ref: '#/components/schemas/Pagination' }
                }
              }
            }
          }
        }
      }
    }
  },
  '/outlets/{outletId}/inventory': {
    post: {
      tags: ['Inventory'],
      summary: 'Record inventory',
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'outletId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' }
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/InventoryRecord' }
          }
        }
      },
      responses: {
        201: {
          description: 'Inventory recorded',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Inventory' }
            }
          }
        }
      }
    }
  },
  '/inventory/{id}/reconcile': {
    put: {
      tags: ['Inventory'],
      summary: 'Reconcile inventory',
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
              required: ['products'],
              properties: {
                products: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['productId', 'reconciledQuantity'],
                    properties: {
                      productId: { type: 'string', format: 'uuid' },
                      reconciledQuantity: { type: 'integer', minimum: 0 }
                    }
                  }
                }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Inventory reconciled',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Inventory' }
            }
          }
        }
      }
    }
  }
};
