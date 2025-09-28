// @ts-ignore
import swaggerJsdoc from 'swagger-jsdoc';
import { UserRole } from '../database/entities/User';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'ShopMaster API',
    version: '1.0.0',
    description: 'Comprehensive documentation for ShopMaster backend API',
    contact: {
      name: 'API Support',
      email: 'support@shopmaster.com'
    },
    license: {
      name: 'MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:5000/api/v1',
      description: 'Development server'
    }
  ],
  tags: [
    {
      name: 'Auth',
      description: 'User authentication and authorization'
    },
    {
      name: 'Users',
      description: 'User management operations'
    },
    {
      name: 'Businesses',
      description: 'Business management operations'
    },
    {
      name: 'Products',
      description: 'Product inventory operations'
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  },
  security: [{
    BearerAuth: []
  }]
};

const options = {
  swaggerDefinition,
  // Paths to files containing OpenAPI definitions
  apis: [
    './src/docs/**/*.ts',
    './src/routes/*.ts'
  ]
};

export const swaggerSpec = swaggerJsdoc(options);
