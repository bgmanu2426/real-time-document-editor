<div align="center">
  
# 📝 Real-Time Collaborative Document Editor

### *Where ideas meet collaboration*

[![Next.js](https://img.shields.io/badge/Next.js-15.x-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.x-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-010101?style=for-the-badge&logo=socket.io)](https://socket.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)

*A powerful, modern collaborative document platform that enables seamless real-time editing, version control, and team workflow management. Built with cutting-edge technologies for the modern web.*

</div>

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🔄 **Real-Time Collaboration**
- **Simultaneous editing** by multiple users
- **Live cursor tracking** and user presence
- **Conflict-free synchronization** with Operational Transform
- **Instant auto-save** with visual indicators
- **Real-time notifications** for document changes

### 🌳 **Git-Like Version Control**
- **Complete version history** with rollback capability
- **Branch creation** for parallel development
- **Smart merge system** with conflict resolution
- **Visual diff tools** for comparing versions
- **Restore any previous version** with one click

</td>
<td width="50%">

### 👥 **Advanced Collaboration**
- **Granular permissions** (read, write, admin)
- **Document sharing** with public/private controls
- **Team workspace** management
- **Activity logs** and audit trails
- **Professional workflow** support

### 🎨 **Rich Editor Experience**
- **Modern TipTap editor** with extensive formatting
- **Responsive design** for all devices
- **Keyboard shortcuts** for power users
- **Export capabilities** (PDF, DOCX, HTML)
- **Intuitive sidebar** for navigation

</td>
</tr>
</table>

---

## 🛠️ Technology Stack

<div align="center">

| **Category** | **Technologies** |
|--------------|------------------|
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS |
| **Editor** | TipTap, Prosemirror, Rich Text Extensions |
| **Real-time** | Socket.IO, WebSocket, Operational Transform |
| **Backend** | Next.js API Routes, Server Actions |
| **Database** | PostgreSQL, Drizzle ORM, Redis Cache |
| **Auth** | JWT, bcrypt, Secure Sessions |
| **UI/UX** | Radix UI, Lucide Icons, CSS Animations |
| **Tools** | TypeScript, ESLint, Prettier, Zod |

</div>

---

## 📸 Screenshots

<div align="center">

### 🏠 Beautiful Landing Page
![Landing Page](./public/home.png)

### ✍️ SignIn / Signup page
![SignIn / Signup](./public/login.png)

### 📊 Collaboration Dashboard
![Dashboard](./public/editor.png)

### 🌳 Version Control & Branching
![Version Control](./public/version-control.png)

</div>

---

## 🏗️ Architecture Overview

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[Next.js Client] --> B[TipTap Editor]
        A --> C[Socket.IO Client]
        A --> D[React Components]
    end
    
    subgraph "Backend Layer"
        E[Next.js API] --> F[Authentication]
        E --> G[Document Management]
        E --> H[WebSocket Server]
    end
    
    subgraph "Data Layer"
        I[PostgreSQL] --> J[Users & Documents]
        I --> K[Version History]
        L[Redis] --> M[Sessions]
        L --> N[Real-time Cache]
    end
    
    subgraph "Real-time Engine"
        O[Operational Transform] --> P[Conflict Resolution]
        O --> Q[Live Synchronization]
    end
    
    A --> E
    C --> H
    E --> I
    E --> L
    H --> O
```

### 🔄 Real-Time Synchronization Flow

1. **User Input** → Editor captures changes
2. **Operation Transform** → Converts changes to operations
3. **WebSocket Broadcast** → Sends to all connected clients
4. **Conflict Resolution** → Merges simultaneous edits
5. **State Update** → Updates all client editors
6. **Database Sync** → Persists changes to PostgreSQL

---

## 🚀 Quick Start

> **Prerequisites:** Node.js 18+, PostgreSQL, Redis (optional), and pnpm/npm

### 1️⃣ Clone & Install

```bash
# Clone the repository
git clone https://github.com/your-username/real-time-document-editor.git
cd real-time-document-editor

# Install dependencies
pnpm install
# or
npm install
```

### 2️⃣ Environment Setup

Create your environment file:

```bash
cp .env.example .env
```

Configure your `.env` file:

```env
# Database Configuration
POSTGRES_URL=postgresql://username:password@localhost:5432/realtime_docs
DATABASE_URL=postgresql://username:password@localhost:5432/realtime_docs

# Application Settings
BASE_URL=http://localhost:3000
AUTH_SECRET=your-super-secret-jwt-key-min-32-chars
NODE_ENV=development

# Redis Configuration (Optional - app works without Redis)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Optional: External Services
WEBHOOK_URL=your-webhook-endpoint
```

### 3️⃣ Database Setup

```bash
# Initialize database and generate schema
pnpm db:setup

# Or run steps manually
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

### 4️⃣ Start Development

```bash
# Start development server with hot reload
pnpm dev

# The app will be available at http://localhost:3000
```

### 5️⃣ Production Deployment

```bash
# Build the application
pnpm build

# Start production server
pnpm start
```

**Important Notes for Production:**
- Socket.IO now works consistently in both dev and production modes
- Redis connection failures are handled gracefully with automatic retries
- The app will continue to work without Redis (with reduced collaborative features)
- Increased timeouts and retry logic for better production reliability

### 6️⃣ First Steps

```bash
# Create database
createdb realtime_docs

# Setup database schema
pnpm db:setup

# Generate and run migrations
pnpm db:generate
pnpm db:migrate

# Seed initial data (optional)
pnpm db:seed

# View database in Drizzle Studio (optional)
pnpm db:studio
```

### 4️⃣ Start Development

```bash
# Start the development server
pnpm dev

# Server will be available at:
# 🌐 Web: http://localhost:3000
# 🔌 WebSocket: ws://localhost:3000
```

### 5️⃣ First Steps

1. **Sign Up** → Create your account at `/sign-up`
2. **Create Document** → Start your first collaborative document
3. **Invite Others** → Share with team members
4. **Start Collaborating** → Experience real-time editing magic! ✨

---

## 📖 User Guide

### 🎯 Getting Started

<details>
<summary><b>🔐 Authentication</b></summary>

- **Sign Up**: Create a new account with email and secure password
- **Sign In**: Access your documents with existing credentials
- **Session Management**: Secure JWT-based authentication with auto-renewal

</details>

<details>
<summary><b>📝 Document Management</b></summary>

- **Create Document**: Click "New Document" from the dashboard
- **Open Document**: Click any document tile to start editing
- **Document Settings**: Access sharing, permissions, and metadata
- **Organization**: Filter and search your document library

</details>

<details>
<summary><b>✍️ Collaborative Editing</b></summary>

- **Real-time Sync**: See changes from other users instantly
- **User Presence**: View active collaborators and their cursors
- **Auto-save**: Documents save automatically every few seconds
- **Formatting**: Rich text editor with comprehensive formatting tools

</details>

<details>
<summary><b>🌳 Version Control</b></summary>

- **Version History**: Access complete document timeline
- **Create Branches**: Experiment with parallel development
- **Merge Changes**: Combine branches with smart conflict resolution
- **Restore Versions**: Roll back to any previous state

</details>

<details>
<summary><b>👥 Collaboration Features</b></summary>

- **Share Documents**: Invite users via email or shareable links
- **Permission Levels**: Set read, write, or admin access
- **Team Workspaces**: Organize documents by teams or projects
- **Activity Tracking**: Monitor all document changes and user actions

</details>

---

## 🔧 Development

### 🛠️ Available Scripts

```bash
# Development
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm start            # Start production server

# Database Management
pnpm db:setup         # Initialize database
pnpm db:generate      # Generate migrations
pnpm db:migrate       # Run migrations
pnpm db:seed          # Seed test data
pnpm db:studio        # Open Drizzle Studio

# Code Quality
pnpm lint             # Run ESLint
pnpm type-check       # TypeScript check
pnpm format           # Format with Prettier
```

### 🌐 Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `POSTGRES_URL` | PostgreSQL connection string | ✅ | - |
| `REDIS_HOST` | Redis server host | ⚠️ | `127.0.0.1` |
| `REDIS_PORT` | Redis server port | ⚠️ | `6379` |
| `REDIS_PASSWORD` | Redis server password | ⚠️ | - |
| `AUTH_SECRET` | JWT signing secret (32+ chars) | ✅ | - |
| `BASE_URL` | Application base URL | ✅ | `http://localhost:3000` |
| `NODE_ENV` | Environment mode | ✅ | `development` |

⚠️ **Redis is optional** - The application will work without Redis but with reduced collaborative features.

### 🔍 Troubleshooting

#### Socket.IO Connection Issues

**Problem**: Socket.IO timeouts in production mode
**Solution**: ✅ Fixed! The app now uses consistent server configuration in both dev and production.

**Problem**: "Connection timeout" errors
**Solutions**:
- Check that `BASE_URL` environment variable matches your deployment URL
- Ensure the server is running on the correct port
- Verify WebSocket support is enabled in your hosting environment

#### Redis Connection Issues

**Problem**: Redis connection failures
**Solution**: ✅ The app now handles Redis failures gracefully:
- Automatic retry logic (5 attempts with exponential backoff)
- Graceful fallback when Redis is unavailable
- Real-time features work without Redis (with some limitations)

**Problem**: TLS/SSL errors with cloud Redis
**Solution**: The app auto-detects Redis configuration:
- Uses `rediss://` protocol for cloud Redis with TLS
- Uses standard connection for local Redis
- Handles authentication automatically

#### Testing Socket.IO

Visit `/socket-test` in your browser to test Socket.IO connectivity:
- Real-time connection status
- Debug logs and error messages
- Authentication testing

```bash
# Test Socket.IO endpoint directly
curl -I http://localhost:3000/socket.io/
# Should return HTTP 400 (expected for direct HTTP access)
```

---

## 🔒 Security & Privacy

### 🛡️ Security Features

- **🔐 JWT Authentication** with secure token rotation
- **🔑 Password Hashing** using bcrypt with salt rounds  
- **🎯 Role-based Access Control** for documents and features
- **✅ Input Validation** with Zod schema validation
- **🛑 SQL Injection Protection** via parameterized queries
- **🚫 XSS Prevention** with proper input sanitization
- **🔒 CSRF Protection** with secure headers
- **📡 Secure WebSocket** connections with authentication

### 🔐 Privacy Compliance

- **Data Encryption** in transit and at rest
- **User Consent** management for data processing
- **Data Retention** policies with automatic cleanup
- **Audit Logging** for compliance requirements
- **GDPR Ready** with data export and deletion

---

## 📈 Roadmap

### 🎯 Current Focus (v1.x)

- [ ] **📱 Mobile App** - React Native version
- [ ] **🔍 Advanced Search** - Full-text search across documents
- [ ] **📊 Analytics Dashboard** - Usage metrics and insights
- [ ] **🎨 Custom Themes** - User-defined editor themes
- [ ] **🔗 Integrations** - Slack, Discord, Teams notifications

### 🚀 Future Plans (v2.x)

- [ ] **🤖 AI Assistant** - Smart writing suggestions
- [ ] **📹 Video Calls** - Integrated collaboration calls
- [ ] **📁 Advanced Workflows** - Approval processes
- [ ] **🌍 Offline Support** - Work without internet
- [ ] **📊 Advanced Analytics** - Team productivity insights

---

## 🌟 Showcase

### 🏆 Perfect For

- **� Technical Documentation** - API docs, guides, wikis
- **✍️ Content Creation** - Blog posts, articles, books
- **🎓 Education** - Collaborative note-taking, research
- **💼 Business** - Reports, proposals, meeting notes
- **👥 Team Projects** - Sprint planning, brainstorming
- **📚 Knowledge Management** - Company wikis, handbooks

### 💡 Use Cases

- **Remote Teams** collaborating on documentation
- **Content Teams** creating and reviewing articles
- **Educational Institutions** for collaborative research
- **Consultancies** working on client proposals
- **Open Source Projects** maintaining documentation

---

## 🙏 Acknowledgments

Special thanks to the amazing open-source community:

- **[TipTap](https://tiptap.dev/)** - Excellent headless editor framework
- **[Socket.IO](https://socket.io/)** - Reliable real-time communication  
- **[Drizzle ORM](https://orm.drizzle.team/)** - Type-safe database operations
- **[Next.js](https://nextjs.org/)** - Outstanding React framework
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Radix UI](https://www.radix-ui.com/)** - Accessible component primitives

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

```
MIT License - Feel free to use this project for commercial and non-commercial purposes.
```

---

<div align="center">

### ⭐ If you find this project helpful, please give it a star!

**Built with ❤️ using Next.js, React, and modern web technologies**

[⬆️ Back to top](#-real-time-collaborative-document-editor)

---

*Made with 💡 by passionate developers for the developer community*

</div>