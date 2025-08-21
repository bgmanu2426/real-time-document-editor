# Real-Time Collaborative Document Platform

A comprehensive collaborative document platform that enables multiple users to work simultaneously on documents with real-time synchronization and conflict resolution. Features a Git-like version control system supporting branching, merging, and rollback capabilities, plus workflow management tools for professional team collaboration.

## 🚀 Features

### Core Collaboration Features
- **Real-time collaborative editing** with conflict-free synchronization using Operational Transform
- **Multi-user presence indicators** showing active users and their cursors
- **Live document synchronization** across all connected clients
- **Auto-save functionality** with visual save status indicators

### Version Control System
- **Git-like version control** with branching and merging capabilities
- **Document versioning** with complete history tracking
- **Branch management** for parallel development workflows
- **Merge conflict resolution** with visual diff tools
- **Rollback functionality** to restore previous versions

### Collaboration & Communication
- **Threaded comment system** with inline document comments
- **User permissions management** (read, write, admin levels)
- **Document sharing** with public/private visibility controls
- **Real-time notifications** for document changes and mentions

### Workflow Management
- **Professional review workflows** with approval processes
- **Team collaboration tools** for document lifecycle management
- **Activity logging** and audit trails
- **Document status tracking** (draft, in review, approved, etc.)

### Professional Interface
- **Modern, responsive UI** built with Tailwind CSS
- **Rich text editor** with formatting tools and keyboard shortcuts
- **Document dashboard** with organized document management
- **Sidebar panels** for comments, history, and collaborators

## 🛠 Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS v3
- **Editor**: TipTap (rich text editor with collaborative extensions)
- **Real-time**: Socket.IO for WebSocket connections
- **Backend**: Next.js API Routes with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Caching**: Redis for session management and real-time data
- **Authentication**: JWT-based with bcrypt password hashing
- **Version Control**: Custom operational transform implementation

## 🏗 Architecture

### Database Schema
```
Users → Documents (1:many owner relationship)
Documents → DocumentVersions (1:many versioning)
Documents → DocumentBranches (1:many branching)
Documents → DocumentCollaborators (many:many with permissions)
Documents → DocumentComments (1:many commenting)
Documents → DocumentWorkflows (1:many workflow management)
Documents → DocumentOperations (1:many operation logging)
DocumentMerges → Track merge operations between branches
```

### Real-time Architecture
- **Socket.IO Server**: Handles real-time connections and document synchronization
- **Redis Integration**: Stores active user sessions and operation queues
- **Operational Transform**: Ensures conflict-free collaborative editing
- **Presence System**: Tracks and broadcasts user activity and cursor positions

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Redis server
- npm or yarn package manager

### Installation

1. **Clone and install dependencies**:
```bash
git clone <repository-url>
cd collaborative-document-platform
npm install
```

2. **Set up environment variables**:
```bash
cp .env.example .env
```

Update `.env` with your database credentials:
```env
POSTGRES_URL=postgresql://username:password@localhost:5432/collaborative_docs
BASE_URL=http://localhost:3000
AUTH_SECRET=your-super-secret-jwt-key
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
NODE_ENV=development
```

3. **Set up the database**:
```bash
# Create database
createdb collaborative_docs

# Run migrations
npm run db:generate
npm run db:migrate

# Seed initial data
npm run db:seed
```

4. **Start the development server**:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## 📖 Usage Guide

### Getting Started
1. **Sign up** for a new account or **sign in** with existing credentials
2. **Create your first document** from the dashboard
3. **Invite collaborators** by sharing the document or adding them directly
4. **Start editing** with real-time collaboration features

### Document Management
- **Create**: Click "New Document" to create a new collaborative document
- **Edit**: Click on any document to open the collaborative editor
- **Share**: Use the share button to invite collaborators or make documents public
- **Organize**: Use the dashboard to manage your owned and shared documents

### Collaboration Features
- **Real-time Editing**: Multiple users can edit simultaneously with live updates
- **Comments**: Click and drag to select text, then add comments for discussion
- **Presence**: See other users' cursors and activity in real-time
- **Permissions**: Manage who can read, write, or administrate your documents

### Version Control
- **Branches**: Create branches for experimental changes or parallel development
- **Versions**: Every save creates a new version with complete history
- **Merging**: Merge branches with automatic conflict resolution
- **History**: View complete document history and restore previous versions

## 🔧 API Documentation

### Authentication Endpoints
- `POST /api/auth/sign-in` - User login
- `POST /api/auth/sign-up` - User registration
- `GET /api/user` - Get current user info

### Document Endpoints
- `GET /api/documents` - List user's documents
- `POST /api/documents` - Create new document
- `GET /api/documents/[id]` - Get specific document
- `PUT /api/documents/[id]` - Update document
- `DELETE /api/documents/[id]` - Delete document

### Version Control Endpoints
- `GET /api/documents/[id]/versions` - Get document versions
- `POST /api/documents/[id]/versions` - Create new version
- `GET /api/documents/[id]/branches` - Get document branches
- `POST /api/documents/[id]/branches` - Create new branch
- `POST /api/documents/[id]/branches/merge` - Merge branches

### Collaboration Endpoints
- `GET /api/documents/[id]/collaborators` - List collaborators
- `POST /api/documents/[id]/collaborators` - Add collaborator
- `PUT /api/documents/[id]/collaborators` - Update permissions
- `DELETE /api/documents/[id]/collaborators` - Remove collaborator

## 🔌 WebSocket Events

### Client → Server
- `authenticate` - Authenticate user for real-time features
- `join-document` - Join a document for collaborative editing
- `leave-document` - Leave document collaboration
- `document-operation` - Send document edit operation
- `cursor-update` - Update cursor position
- `create-branch` - Create new document branch
- `merge-branch` - Merge document branches

### Server → Client
- `authenticated` - Confirm authentication success
- `document-users` - List of active users in document
- `user-joined` - New user joined document
- `user-left` - User left document
- `document-operation` - Receive document edit operation
- `cursor-update` - Receive cursor position update
- `branch-created` - New branch created
- `branch-merged` - Branch merge completed
- `merge-conflict` - Merge conflict detected

## 🏢 Production Deployment

### Environment Setup
1. Set up production PostgreSQL and Redis instances
2. Configure environment variables for production
3. Set up SSL certificates for secure connections
4. Configure proper CORS settings for your domain

### Deployment Options
- **Vercel**: Recommended for Next.js applications
- **Railway**: Full-stack deployment with database hosting
- **AWS**: EC2 with RDS and ElastiCache
- **Docker**: Containerized deployment with docker-compose

### Performance Considerations
- **Database Indexing**: Ensure proper indexes on document queries
- **Redis Caching**: Configure Redis for optimal real-time performance
- **CDN**: Use CDN for static assets and improved global performance
- **WebSocket Scaling**: Consider Socket.IO Redis adapter for multi-instance deployments

## 🧪 Testing

Run the test suite:
```bash
npm test
```

Run specific test categories:
```bash
npm run test:unit      # Unit tests
npm run test:integration # Integration tests
npm run test:e2e       # End-to-end tests
```

## 🔒 Security Features

- **JWT Authentication** with secure session management
- **Password Hashing** using bcrypt with salt rounds
- **Role-based Permissions** for document access control
- **Input Validation** using Zod schemas
- **SQL Injection Protection** through parameterized queries
- **XSS Protection** with proper input sanitization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **TipTap** for the excellent rich text editor
- **Socket.IO** for real-time communication
- **Drizzle ORM** for type-safe database operations
- **Tailwind CSS** for the beautiful UI components
- **Next.js** team for the amazing full-stack framework

## 📞 Support

For support, email support@example.com or join our community discussions.

---

**Built with ❤️ using Next.js, React, and modern web technologies.**