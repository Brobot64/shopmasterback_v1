import { UserSchema } from '../schemas/user';

export const LoginResponse = {
  description: 'Successful login',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          token: {
            type: 'string',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
          },
          user: {
            $ref: '#/components/schemas/User'
          }
        }
      }
    }
  }
};

export const UserListResponse = {
  description: 'List of users with pagination',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            example: 'success'
          },
          data: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/User'
            }
          },
          pagination: {
            $ref: '#/components/schemas/Pagination'
          }
        }
      }
    }
  }
};
