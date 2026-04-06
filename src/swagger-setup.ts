/**
 * Swagger/OpenAPI Setup for Phyo Server
 * Initializes and configures Swagger UI documentation
 * Access at: http://localhost:4000/swagger-ui or http://localhost:4000/api-docs
 */

import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import { correctPaths, correctSchemas } from './swagger-correct-spec';

const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Phyo API v1.0',
    description: 'Complete Influencer Marketing Platform API with Campaign Management, Analytics, Payments, and AI Integration',
    version: '1.0.0',
    contact: {
      name: 'Phyo Team',
      email: 'support@phyo.ai'
    }
  },
  servers: [
    {
      url: 'http://localhost:4000',
      description: 'Development server'
    },
    {
      url: 'https://api.phyo.ai',
      description: 'Production server'
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: correctSchemas
  },
  tags: [
    { name: 'Authentication', description: 'User authentication endpoints' },
    { name: 'Users', description: 'User management' },
    { name: 'Influencers', description: 'Influencer profile and portfolio management' },
    { name: 'Brands', description: 'Brand profile and management' },
    { name: 'Campaigns', description: 'Campaign creation and management' },
    { name: 'Requests', description: 'Brand and Influencer requests' },
    { name: 'Analytics', description: 'Analytics and dashboard data' },
    { name: 'Payments', description: 'Payment processing and subscriptions' },
    { name: 'Upload', description: 'File upload and management' },
    { name: 'Messages', description: 'Messaging and conversations' },
    { name: 'Meta', description: 'Meta Ads and Instagram integration' },
    { name: 'Admin', description: 'Admin management endpoints' },
    { name: 'AI', description: 'AI-powered features (Ask/Claude)' },
    { name: 'Account', description: 'Account and subscription management' },
    { name: 'Landing', description: 'Landing page content' },
    { name: 'Documentation', description: 'API documentation' }
  ],
  paths: correctPaths
};

/**
 * Initialize Swagger documentation for the Express app
 * @param app Express application instance
 */
export const initSwagger = (app: Express) => {
  // Serve Swagger UI
  app.use('/swagger-ui', swaggerUi.serve);
  app.get('/swagger-ui', swaggerUi.setup(swaggerSpec, {
    swaggerOptions: {
      urls: [
        {
          url: '/api-docs',
          name: 'OpenAPI 3.0.0'
        }
      ]
    }
  }));

  // Serve OpenAPI spec as JSON
  app.get('/api-docs', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Serve documentation browser (markdown)
  app.get('/docs', (_req, res) => {
    const docsHTML = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Phyo API - Documentation</title>
          <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
          <script src="https://cdn.jsdelivr.net/npm/highlight.js@11.8.0/lib/highlight.min.js"></script>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@11.8.0/styles/atom-one-dark.min.css">
          <style>
              * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
              }
              body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
                  background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
                  color: #333;
                  min-height: 100vh;
              }
              .container {
                  display: flex;
                  min-height: 100vh;
              }
              .sidebar {
                  width: 280px;
                  background: white;
                  border-right: 1px solid #e0e0e0;
                  overflow-y: auto;
                  padding: 20px;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              }
              .sidebar-header {
                  padding-bottom: 15px;
                  border-bottom: 2px solid #007bff;
                  margin-bottom: 20px;
              }
              .sidebar-header h2 {
                  color: #007bff;
                  font-size: 18px;
                  font-weight: 600;
              }
              .doc-list {
                  list-style: none;
              }
              .doc-list li {
                  margin-bottom: 8px;
              }
              .doc-list a {
                  display: block;
                  padding: 10px 12px;
                  color: #333;
                  text-decoration: none;
                  border-radius: 4px;
                  transition: all 0.3s ease;
                  font-size: 14px;
                  border-left: 3px solid transparent;
              }
              .doc-list a:hover {
                  background: #f5f5f5;
                  color: #007bff;
                  border-left-color: #007bff;
              }
              .doc-list a.active {
                  background: #e7f3ff;
                  color: #007bff;
                  border-left-color: #007bff;
                  font-weight: 600;
              }
              .main-content {
                  flex: 1;
                  overflow-y: auto;
                  background: white;
              }
              .content {
                  max-width: 900px;
                  margin: 0 auto;
                  padding: 40px;
              }
              .content h1 {
                  color: #007bff;
                  margin-bottom: 20px;
                  padding-bottom: 10px;
                  border-bottom: 2px solid #e0e0e0;
              }
              .content h2 {
                  color: #333;
                  margin-top: 30px;
                  margin-bottom: 15px;
                  font-size: 24px;
              }
              .content h3 {
                  color: #555;
                  margin-top: 20px;
                  margin-bottom: 10px;
                  font-size: 18px;
              }
              .content p {
                  line-height: 1.6;
                  margin-bottom: 15px;
                  color: #555;
              }
              .content code {
                  background: #f4f4f4;
                  padding: 2px 6px;
                  border-radius: 3px;
                  font-family: 'Courier New', monospace;
                  color: #d63384;
              }
              .content pre {
                  background: #282c34;
                  color: #abb2bf;
                  padding: 15px;
                  border-radius: 6px;
                  overflow-x: auto;
                  margin-bottom: 15px;
              }
              .welcome {
                  text-align: center;
                  padding: 60px 40px;
                  color: #666;
              }
              @media (max-width: 768px) {
                  .sidebar {
                      display: none;
                  }
                  .content {
                      padding: 20px;
                  }
              }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="sidebar">
                  <div class="sidebar-header">
                      <h2>📚 API Docs</h2>
                      <p>Phyo v1.0</p>
                  </div>
                  <ul class="doc-list" id="docList"></ul>
              </div>
              <div class="main-content">
                  <div class="content" id="content">
                      <div class="welcome">
                          <h1>📖 Welcome to Phyo API</h1>
                          <p>Select a documentation file from the sidebar to get started</p>
                          <p style="margin-top: 20px; color: #999; font-size: 14px;">Or visit <a href="/swagger-ui" style="color: #007bff;">Swagger UI</a> for interactive API testing</p>
                      </div>
                  </div>
              </div>
          </div>
          <script>
              // Documentation files to load
              const docs = [
                  { title: 'Docs Overview', file: 'README.md' },
                  { title: 'Environment Setup', file: 'environment-setup.md' },
                  { title: 'Campaigns', file: 'CAMPAIGN_API_DOCS.md' },
                  { title: 'Chat System', file: 'chat-system.md' },
                  { title: 'Brand Requests', file: 'BRAND_REQUEST_API.md' },
                  { title: 'User To Brand Conversion', file: 'USER_TO_BRAND_CONVERSION_API.md' },
                  { title: 'Payment Integration', file: 'PAYMENT_INTEGRATION_GUIDE.md' },
                  { title: 'Meta Ads Integration', file: 'META_ADS_INTEGRATION.md' },
                  { title: 'Google OAuth Setup', file: 'google-oauth-setup.md' },
                  { title: 'Email OTP System', file: 'email-otp-system.md' },
                  { title: 'S3 Setup', file: 'AWS_S3_SETUP_GUIDE.md' }
              ];

              const docList = document.getElementById('docList');
              const contentDiv = document.getElementById('content');

              // Populate sidebar
              docs.forEach((doc, index) => {
                  const li = document.createElement('li');
                  const a = document.createElement('a');
                  a.href = '#';
                  a.textContent = doc.title;
                  a.dataset.index = index;
                  a.onclick = (e) => {
                      e.preventDefault();
                      loadDoc(index, a, doc.file);
                  };
                  if (index === 0) a.classList.add('active');
                  li.appendChild(a);
                  docList.appendChild(li);
              });

              // Load documentation
              function loadDoc(index, element, file) {
                  // In a real app, you'd fetch the markdown file from /docs directory
                  const docContent = \`# Documentation\n\nDocumentation file: \${file}\n\nFor complete API documentation, please visit:\n\n- **Swagger UI**: /swagger-ui\n- **API Docs JSON**: /api-docs\n- **Postman**: Import Phyo_Server_API.postman_collection.json\`;

                  contentDiv.innerHTML = marked.parse(docContent);

                  // Highlight code blocks
                  document.querySelectorAll('pre code').forEach((block) => {
                      hljs.highlightElement(block);
                  });

                  // Update active link
                  document.querySelectorAll('.doc-list a').forEach(a => a.classList.remove('active'));
                  element.classList.add('active');

                  // Scroll to top
                  contentDiv.scrollTop = 0;
              }
          </script>
      </body>
      </html>
    `;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(docsHTML);
  });
};

export default swaggerSpec;
