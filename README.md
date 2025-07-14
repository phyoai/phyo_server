# Phyo Server - TypeScript Backend

This is a Node.js backend application built with TypeScript, Express, MongoDB, and Socket.IO for real-time communication.

## Features

- **TypeScript**: Full TypeScript support with proper type definitions
- **Authentication**: JWT-based authentication system
- **Real-time Chat**: Socket.IO integration for real-time messaging
- **Database**: MongoDB with Mongoose ODM
- **OpenAI Integration**: AI-powered influencer matching system
- **Bright Data Integration**: Real-time Instagram influencer data
- **RESTful APIs**: Well-structured REST API endpoints

## Project Structure

```
src/
├── connections/          # Database connection utilities
├── controllers/          # Request handlers and business logic
├── middleware/           # Authentication and other middleware
├── models/              # Mongoose data models
├── routes/              # API route definitions
├── services/            # External service integrations (Bright Data, S3)
├── types/               # TypeScript type definitions
├── index.ts             # Main server entry point
└── socket.ts            # Socket.IO event handlers
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
Create a `.env` file in the root directory with:
```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
OPENAI_API_KEY=your_openai_api_key
BRIGHTDATA_API_KEY=your_brightdata_api_key
EMAIL_USER=your_email_username
EMAIL_PASS=your_email_password
EMAIL_HOST=your_smtp_host
EMAIL_PORT=587
PORT=4000
```

### Development

Run the development server with hot reload:
```bash
npm run dev
```

### Production

Build the TypeScript code:
```bash
npm run build
```

Start the production server:
```bash
npm start
```

## API Endpoints

### Authentication
- `POST /api/user/signup` - User registration
- `POST /api/user/login` - User login
- `POST /api/user/forgot-password` - Password reset request
- `POST /api/user/verify-code` - Verify reset code
- `POST /api/user/reset-password` - Reset password
- `GET /api/user/influencers` - Get all influencers
- `GET /api/user/influencer/:id` - Get influencer by ID

### User Management
- `GET /api/users/profile` - Get user profile
- `PATCH /api/users/profile` - Update user profile
- `GET /api/users/search` - Search users
- `GET /api/users/:id` - Get user by ID
- `DELETE /api/users/profile` - Delete user account

### Conversations
- `POST /api/conversation` - Create conversation
- `GET /api/conversation/user` - Get user conversations
- `GET /api/conversation/:id` - Get conversation by ID
- `DELETE /api/conversation/:id` - Delete conversation

### Messages
- `POST /api/messages` - Send message
- `GET /api/messages/:conversationId` - Get messages
- `PATCH /api/messages/:id/read` - Mark message as read
- `DELETE /api/messages/:id` - Delete message

### AI & Influencer Matching
- `POST /api/ask` - AI-powered influencer search (combines local DB + Bright Data)
- `GET /api/ask/details?userName=:username` - Get influencer details from local DB
- `GET /api/ask/debug` - Debug database content

### Bright Data Integration
- `GET /api/ask/brightdata/status` - Check Bright Data API availability
- `GET /api/ask/brightdata/details?userName=:username` - Get Bright Data influencer details
- `GET /api/ask/brightdata/analytics?userName=:username` - Get Bright Data analytics
- `GET /api/ask/brightdata/posts?userName=:username&limit=:limit` - Get Bright Data posts

## Bright Data Integration

The application now includes Bright Data API integration for enhanced influencer discovery:

### Features
- **Real-time Instagram Data**: Access to live Instagram influencer data
- **Dual Data Sources**: Combines local database with Bright Data API results
- **Advanced Analytics**: Detailed engagement metrics and audience demographics
- **Automatic Deduplication**: Removes duplicate results from multiple sources

### Setup
1. Sign up for a Bright Data account at [brightdata.com](https://brightdata.com)
2. Generate an API key for Instagram data
3. Add the API key to your `.env` file as `BRIGHTDATA_API_KEY`

### Testing
Test the Bright Data integration:
```bash
npm run test:brightdata
```

For detailed documentation, see [docs/brightdata-integration.md](docs/brightdata-integration.md)

## Socket.IO Events

### Client Events
- `joinConversation` - Join a conversation room
- `leaveConversation` - Leave a conversation room
- `sendMessage` - Send a message
- `seenMessage` - Mark message as seen
- `typing` - Indicate typing status

### Server Events
- `receiveMessage` - New message received
- `messageSeen` - Message was seen
- `userTyping` - User typing indicator
- `messageError` - Message sending error

## TypeScript Features

- **Strong Typing**: All API endpoints, database models, and Socket.IO events are properly typed
- **Interface Definitions**: Comprehensive type definitions for all data structures
- **Generic Types**: Flexible request/response typing with generics
- **Error Handling**: Type-safe error handling throughout the application

## Development Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests (when implemented)
- `npm run import:influencers` - Import influencer data
- `npm run import:clear` - Clear and import fresh influencer data
- `npm run test:brightdata` - Test Bright Data integration

## Technologies Used

- **TypeScript** - Type-safe JavaScript
- **Express.js** - Web framework
- **MongoDB & Mongoose** - Database and ODM
- **Socket.IO** - Real-time communication
- **JWT** - Authentication tokens
- **OpenAI** - AI integration
- **Bright Data** - Instagram data API
- **Nodemailer** - Email functionality
- **bcryptjs** - Password hashing
- **CORS** - Cross-origin resource sharing

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with proper TypeScript types
4. Test your changes
5. Submit a pull request

## License

This project is licensed under the ISC License. 