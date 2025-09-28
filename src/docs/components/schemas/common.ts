export const PaginationSchema = {
    type: 'object',
    properties: {
      totalItems: {
        type: 'number',
        example: 100
      },
      totalPages: {
        type: 'number',
        example: 5
      },
      currentPage: {
        type: 'number',
        example: 1
      },
      itemsPerPage: {
        type: 'number',
        example: 20
      }
    }
  };
  
  export const ErrorSchema = {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        example: 'error'
      },
      message: {
        type: 'string',
        example: 'An error occurred'
      },
      timestamp: {
        type: 'string',
        format: 'date-time'
      }
    }
  };
  
  export const TimestampsSchema = {
    createdAt: {
      type: 'string',
      format: 'date-time'
    },
    updatedAt: {
      type: 'string',
      format: 'date-time'
    }
  };
  