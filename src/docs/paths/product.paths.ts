import { ProductSchema, CreateProductSchema } from '../components/schemas/product';

export const productPaths = {
  '/products': {
    get: {
      tags: ['Products'],
      summary: 'List products',
      description: 'Get paginated list of products with filters',
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'outletId',
          in: 'query',
          schema: { type: 'string', format: 'uuid' }
        },
        {
          name: 'category',
          in: 'query',
          schema: { type: 'string' }
        },
        {
          name: 'minPrice',
          in: 'query',
          schema: { type: 'number', format: 'float' }
        },
        {
          name: 'maxPrice',
          in: 'query',
          schema: { type: 'number', format: 'float' }
        },
        {
          name: 'status',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['available', 'low_stock', 'out_of_stock']
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
                    items: { $ref: '#/components/schemas/Product' }
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
      tags: ['Products'],
      summary: 'Create product',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateProduct' }
          }
        }
      },
      responses: {
        201: {
          description: 'Product created',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Product' }
            }
          }
        }
      }
    }
  },
  '/products/{id}': {
    get: {
      tags: ['Products'],
      summary: 'Get product details',
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
              schema: { $ref: '#/components/schemas/Product' }
            }
          }
        }
      }
    },
    put: {
      tags: ['Products'],
      summary: 'Update product',
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
            schema: { $ref: '#/components/schemas/CreateProduct' }
          }
        }
      },
      responses: {
        200: {
          description: 'Product updated',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Product' }
            }
          }
        }
      }
    },
    delete: {
      tags: ['Products'],
      summary: 'Delete product',
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
        204: { description: 'Product deleted' }
      }
    }
  }
};
