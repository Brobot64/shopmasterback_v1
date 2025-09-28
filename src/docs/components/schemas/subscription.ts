export const SubscriptionSchema = {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid'
      },
      title: {
        type: 'string',
        example: 'Premium Plan'
      },
      amount: {
        type: 'number',
        format: 'float',
        example: 99.99
      },
      duration: {
        type: 'string',
        example: 'monthly'
      },
      description: {
        type: 'string',
        example: 'Full access with all features'
      }
    }
  };
  
  export const CreateSubscriptionSchema = {
    type: 'object',
    required: ['title', 'amount', 'duration'],
    properties: {
      title: {
        type: 'string',
        example: 'Premium Plan'
      },
      amount: {
        type: 'number',
        format: 'float',
        minimum: 0,
        example: 99.99
      },
      duration: {
        type: 'string',
        example: 'monthly'
      },
      description: {
        type: 'string',
        example: 'Full access with all features'
      }
    }
  };
  