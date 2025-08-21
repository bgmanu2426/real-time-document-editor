import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createClient } from 'redis';

export interface SocketData {
  userId: string;
  username: string;
  documentId?: string;
}

export interface DocumentUser {
  userId: string;
  username: string;
  cursor?: {
    position: number;
    selection?: {
      start: number;
      end: number;
    };
  };
}

export class CollaborativeSocketServer {
  private io: SocketIOServer;
  private redisClient;
  private redisPub;
  private redisSub;

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.BASE_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });

    // Initialize Redis clients
    const redisConfig = {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD
    };

    this.redisClient = createClient(redisConfig);
    this.redisPub = createClient(redisConfig);
    this.redisSub = createClient(redisConfig);

    this.initializeRedis();
    this.setupSocketHandlers();
  }

  private async initializeRedis() {
    try {
      await this.redisClient.connect();
      await this.redisPub.connect();
      await this.redisSub.connect();
      console.log('✅ Redis connected successfully');
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
    }
  }

  private setupSocketHandlers() {
    console.log('🔩 Setting up Socket.IO event handlers...');
    this.io.on('connection', (socket) => {
      console.log('👤 User connected:', socket.id, '| Transport:', socket.conn.transport.name);

      // Authentication middleware
      socket.on('authenticate', async (data: { userId: string; username: string }) => {
        console.log('🔐 User authenticated:', data.username, 'Socket:', socket.id);
        
        socket.data = {
          userId: data.userId,
          username: data.username
        } as SocketData;

        socket.emit('authenticated', { success: true });
      });

      // Document collaboration
      socket.on('join-document', async (documentId: string) => {
        console.log('📄 Join document request:', {
          socketId: socket.id,
          documentId,
          hasAuth: !!socket.data?.userId,
          userId: socket.data?.userId
        });
        
        if (!socket.data?.userId) {
          console.log('❌ Join document failed: Not authenticated');
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        socket.data.documentId = documentId;
        await socket.join(`document:${documentId}`);

        // Add user to document presence
        const user: DocumentUser = {
          userId: socket.data.userId,
          username: socket.data.username
        };

        console.log('✅ User joined document:', {
          documentId,
          userId: socket.data.userId,
          username: socket.data.username
        });

        await this.addUserToDocument(documentId, user);
        
        // Notify others about new user
        socket.to(`document:${documentId}`).emit('user-joined', user);

        // Send current document users to the new user
        const documentUsers = await this.getDocumentUsers(documentId);
        socket.emit('document-users', documentUsers);
      });

      socket.on('leave-document', async (documentId: string) => {
        if (!socket.data?.userId) return;

        await socket.leave(`document:${documentId}`);
        await this.removeUserFromDocument(documentId, socket.data.userId);

        socket.to(`document:${documentId}`).emit('user-left', {
          userId: socket.data.userId
        });
      });

      // Real-time document operations
      socket.on('document-operation', async (data: {
        documentId: string;
        operation: any;
        version: number;
      }) => {
        if (!socket.data?.userId) return;

        const transformedOperation = await this.transformOperation(
          data.documentId,
          data.operation,
          data.version
        );

        // Broadcast to all users in the document except sender
        socket.to(`document:${data.documentId}`).emit('document-operation', {
          operation: transformedOperation,
          userId: socket.data.userId,
          timestamp: Date.now()
        });

        // Save operation to Redis for operational transform
        await this.saveOperation(data.documentId, transformedOperation);
      });

      // Cursor tracking
      socket.on('cursor-update', async (data: {
        documentId: string;
        cursor: {
          position: number;
          selection?: { start: number; end: number };
          domPosition?: { top: number; left: number; height: number };
        };
      }) => {
        if (!socket.data?.userId) return;

        await this.updateUserCursor(data.documentId, socket.data.userId, data.cursor);

        socket.to(`document:${data.documentId}`).emit('cursor-update', {
          userId: socket.data.userId,
          username: socket.data.username,
          cursor: data.cursor
        });
      });

      // Version control operations
      socket.on('create-branch', async (data: {
        documentId: string;
        branchName: string;
        fromVersion?: number;
      }) => {
        if (!socket.data?.userId) return;

        const branch = await this.createBranch(
          data.documentId,
          data.branchName,
          socket.data.userId,
          data.fromVersion
        );

        socket.emit('branch-created', branch);
        socket.to(`document:${data.documentId}`).emit('branch-created', branch);
      });

      socket.on('merge-branch', async (data: {
        documentId: string;
        sourceBranch: string;
        targetBranch: string;
      }) => {
        if (!socket.data?.userId) return;

        try {
          const mergeResult = await this.mergeBranch(
            data.documentId,
            data.sourceBranch,
            data.targetBranch,
            socket.data.userId
          );

          socket.emit('branch-merged', mergeResult);
          socket.to(`document:${data.documentId}`).emit('branch-merged', mergeResult);
        } catch (error: any) {
          socket.emit('merge-conflict', {
            error: error?.message || 'Merge failed',
            conflicts: error?.conflicts || []
          });
        }
      });

      // Disconnect handling
      socket.on('disconnect', async () => {
        console.log('👤 User disconnected:', socket.id);
        
        if (socket.data?.documentId && socket.data?.userId) {
          await this.removeUserFromDocument(socket.data.documentId, socket.data.userId);
          
          socket.to(`document:${socket.data.documentId}`).emit('user-left', {
            userId: socket.data.userId
          });
        }
      });
    });
  }

  // Document presence management
  private async addUserToDocument(documentId: string, user: DocumentUser) {
    const key = `document:${documentId}:users`;
    await this.redisClient.hSet(key, user.userId, JSON.stringify(user));
    await this.redisClient.expire(key, 3600); // 1 hour TTL
  }

  private async removeUserFromDocument(documentId: string, userId: string) {
    const key = `document:${documentId}:users`;
    await this.redisClient.hDel(key, userId);
  }

  private async getDocumentUsers(documentId: string): Promise<DocumentUser[]> {
    const key = `document:${documentId}:users`;
    const users = await this.redisClient.hGetAll(key);
    return Object.values(users).map(user => JSON.parse(user));
  }

  private async updateUserCursor(
    documentId: string,
    userId: string,
    cursor: { position: number; selection?: { start: number; end: number }; domPosition?: { top: number; left: number; height: number } }
  ) {
    const key = `document:${documentId}:users`;
    const userStr = await this.redisClient.hGet(key, userId);
    if (userStr) {
      const user: DocumentUser = JSON.parse(userStr);
      user.cursor = cursor;
      await this.redisClient.hSet(key, userId, JSON.stringify(user));
    }
  }

  // Operational Transform implementation
  private async transformOperation(
    documentId: string,
    operation: any,
    clientVersion: number
  ): Promise<any> {
    // Get operations since client version
    const serverOperations = await this.getOperationsSince(documentId, clientVersion);
    
    // Transform the client operation against server operations
    let transformedOp = operation;
    for (const serverOp of serverOperations) {
      transformedOp = this.operationalTransform(transformedOp, serverOp);
    }
    
    return transformedOp;
  }

  // Simple operational transform for text operations
  private operationalTransform(clientOp: any, serverOp: any): any {
    // This is a simplified OT implementation
    // In production, use a library like ShareJS or Yjs
    if (clientOp.type === 'insert' && serverOp.type === 'insert') {
      if (clientOp.position <= serverOp.position) {
        return clientOp;
      } else {
        return {
          ...clientOp,
          position: clientOp.position + serverOp.length
        };
      }
    }
    
    if (clientOp.type === 'delete' && serverOp.type === 'insert') {
      if (clientOp.position <= serverOp.position) {
        return clientOp;
      } else {
        return {
          ...clientOp,
          position: clientOp.position + serverOp.length
        };
      }
    }
    
    // Handle other transformation cases
    return clientOp;
  }

  private async saveOperation(documentId: string, operation: any) {
    const key = `document:${documentId}:operations`;
    const operationData = {
      ...operation,
      timestamp: Date.now()
    };
    
    await this.redisClient.lPush(key, JSON.stringify(operationData));
    await this.redisClient.expire(key, 86400); // 24 hours TTL
  }

  private async getOperationsSince(documentId: string, version: number): Promise<any[]> {
    const key = `document:${documentId}:operations`;
    const operations = await this.redisClient.lRange(key, 0, -1);
    
    return operations
      .map(op => JSON.parse(op))
      .filter(op => op.version > version)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  // Version control methods
  private async createBranch(
    documentId: string,
    branchName: string,
    userId: string,
    fromVersion?: number
  ) {
    const branch = {
      id: `${documentId}:${branchName}`,
      name: branchName,
      documentId,
      createdBy: userId,
      createdAt: Date.now(),
      fromVersion: fromVersion || 0
    };

    const key = `document:${documentId}:branches`;
    await this.redisClient.hSet(key, branchName, JSON.stringify(branch));
    
    return branch;
  }

  private async mergeBranch(
    documentId: string,
    sourceBranch: string,
    targetBranch: string,
    userId: string
  ) {
    // This is a simplified merge implementation
    // In production, implement proper 3-way merge with conflict detection
    const mergeResult = {
      success: true,
      mergedBy: userId,
      mergedAt: Date.now(),
      sourceBranch,
      targetBranch,
      conflicts: []
    };

    return mergeResult;
  }

  public getIO() {
    return this.io;
  }
}

export default CollaborativeSocketServer;