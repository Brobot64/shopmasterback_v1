import { LoginResponse } from 'docs/components/schemas/success';
import { RegisterUserSchema } from '../components/schemas/user';

export const authPaths = {
  '/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'User login',
      description: 'Authenticate user and return JWT token',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'password'],
              properties: {
                email: {
                  type: 'string',
                  format: 'email',
                  example: 'user@shopmaster.com'
                },
                password: {
                  type: 'string',
                  format: 'password',
                  example: 'password123'
                }
              }
            }
          }
        }
      },
      responses: {
        200: LoginResponse,
        400: {
          description: 'Invalid credentials'
        }
      }
    }
  },
  '/auth/register': {
    post: {
      tags: ['Auth'],
      summary: 'Register a new owner',
      description: 'Register a new business owner account',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: RegisterUserSchema
          }
        }
      },
      responses: {
        201: {
          description: 'User registered successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: {
                    type: 'string',
                    example: 'Registration initiated. OTP sent to your email/phone'
                  },
                  user: {
                    $ref: '#/components/schemas/User'
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};
