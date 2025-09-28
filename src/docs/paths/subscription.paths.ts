import { SubscriptionSchema, CreateSubscriptionSchema } from '../components/schemas/subscription';

export const subscriptionPaths = {
  '/subscriptions': {
    get: {
      tags: ['Subscriptions'],
      summary: 'List subscriptions',
      security: [{ BearerAuth: [] }],
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
                    items: { $ref: '#/components/schemas/Subscription' }
                  }
                }
              }
            }
          }
        }
      }
    },
    post: {
      tags: ['Subscriptions'],
      summary: 'Create subscription',
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateSubscription' }
          }
        }
      },
      responses: {
        201: {
          description: 'Subscription created',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Subscription' }
            }
          }
        }
      }
    }
  },
  '/businesses/{id}/subscribe': {
    post: {
      tags: ['Subscriptions'],
      summary: 'Subscribe business',
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
              required: ['subscriptionId'],
              properties: {
                subscriptionId: { type: 'string', format: 'uuid' }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Business subscribed successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string' },
                  message: { type: 'string' },
                  data: { $ref: '#/components/schemas/Subscription' }
                }
              }
            }
          }
        }
      }
    }
  }
};
