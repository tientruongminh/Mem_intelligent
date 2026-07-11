export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Telegram Sales Intelligence API',
    version: '0.1.0',
    description:
      'Tenant-aware API. AI capabilities cannot close deals or send Telegram customer messages.',
  },
  servers: [{ url: 'http://localhost:4000' }],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
  },
  paths: {
    '/health': {
      get: { summary: 'Health check', responses: { '200': { description: 'Healthy' } } },
    },
    '/api/v1/auth/login': {
      post: { summary: 'Login', responses: { '200': { description: 'Access token' } } },
    },
    '/api/v1/customers': {
      get: {
        summary: 'List customers',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Customers' } },
      },
    },
    '/api/v1/conversations': {
      get: {
        summary: 'List conversations',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Conversations' } },
      },
    },
    '/api/v1/conversations/{id}/close': {
      post: {
        summary: 'Manually close a conversation',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Closed conversation' } },
      },
    },
    '/api/v1/conversations/{id}/workflow': {
      get: {
        summary: 'Get dynamic workflow graph',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Graph' } },
      },
    },
    '/api/v1/reports/{id}/download-url': {
      post: {
        summary: 'Create expiring MinIO download URL',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Presigned URL' } },
      },
    },
  },
};
