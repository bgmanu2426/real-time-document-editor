// Simplified Operational Transform implementation
// In production, consider using libraries like ShareJS or Yjs

export interface TextOperation {
  type: 'retain' | 'insert' | 'delete';
  count?: number;  // for retain and delete
  text?: string;   // for insert
}

export interface DocumentState {
  content: string;
  version: number;
}

export class OperationalTransform {
  static apply(content: string, operations: TextOperation[]): string {
    let result = content;
    let offset = 0;

    for (const op of operations) {
      switch (op.type) {
        case 'retain':
          offset += op.count || 0;
          break;
        case 'insert':
          if (op.text) {
            result = result.slice(0, offset) + op.text + result.slice(offset);
            offset += op.text.length;
          }
          break;
        case 'delete':
          if (op.count) {
            result = result.slice(0, offset) + result.slice(offset + op.count);
          }
          break;
      }
    }

    return result;
  }

  static transform(op1: TextOperation[], op2: TextOperation[]): [TextOperation[], TextOperation[]] {
    // This is a simplified transform - production systems would need more sophisticated logic
    let transformed1: TextOperation[] = [];
    let transformed2: TextOperation[] = [];
    
    let i1 = 0, i2 = 0;
    let pos1 = 0, pos2 = 0;

    while (i1 < op1.length || i2 < op2.length) {
      const o1 = i1 < op1.length ? op1[i1] : null;
      const o2 = i2 < op2.length ? op2[i2] : null;

      if (!o1) {
        transformed2.push(o2!);
        i2++;
        continue;
      }

      if (!o2) {
        transformed1.push(o1);
        i1++;
        continue;
      }

      // Handle different operation combinations
      if (o1.type === 'retain' && o2.type === 'retain') {
        const minCount = Math.min(o1.count || 0, o2.count || 0);
        transformed1.push({ type: 'retain', count: minCount });
        transformed2.push({ type: 'retain', count: minCount });
        
        // Update operations
        if ((o1.count || 0) > minCount) {
          op1[i1] = { ...o1, count: (o1.count || 0) - minCount };
        } else {
          i1++;
        }
        
        if ((o2.count || 0) > minCount) {
          op2[i2] = { ...o2, count: (o2.count || 0) - minCount };
        } else {
          i2++;
        }
      } else if (o1.type === 'insert' && o2.type === 'retain') {
        transformed1.push(o1);
        transformed2.push({ type: 'retain', count: o1.text?.length || 0 });
        i1++;
      } else if (o1.type === 'retain' && o2.type === 'insert') {
        transformed1.push({ type: 'retain', count: o2.text?.length || 0 });
        transformed2.push(o2);
        i2++;
      } else if (o1.type === 'insert' && o2.type === 'insert') {
        // Concurrent inserts - prioritize by position or user ID
        if (pos1 <= pos2) {
          transformed1.push(o1);
          transformed2.push({ type: 'retain', count: o1.text?.length || 0 });
          i1++;
        } else {
          transformed1.push({ type: 'retain', count: o2.text?.length || 0 });
          transformed2.push(o2);
          i2++;
        }
      } else {
        // Handle other cases (delete operations, etc.)
        transformed1.push(o1);
        transformed2.push(o2);
        i1++;
        i2++;
      }
    }

    return [transformed1, transformed2];
  }

  static compose(ops1: TextOperation[], ops2: TextOperation[]): TextOperation[] {
    // Compose two operation sequences
    const result: TextOperation[] = [];
    let i1 = 0, i2 = 0;

    while (i1 < ops1.length || i2 < ops2.length) {
      const op1 = i1 < ops1.length ? ops1[i1] : null;
      const op2 = i2 < ops2.length ? ops2[i2] : null;

      if (!op1) {
        result.push(op2!);
        i2++;
        continue;
      }

      if (!op2) {
        result.push(op1);
        i1++;
        continue;
      }

      // Simplistic composition - production would need more cases
      if (op1.type === 'retain' && op2.type === 'retain') {
        result.push({ type: 'retain', count: Math.min(op1.count || 0, op2.count || 0) });
      } else if (op1.type === 'insert' && op2.type === 'retain') {
        result.push(op1);
      } else {
        result.push(op1);
        result.push(op2);
      }

      i1++;
      i2++;
    }

    return result;
  }

  static createInsertOp(position: number, text: string, contentLength: number): TextOperation[] {
    const ops: TextOperation[] = [];
    
    if (position > 0) {
      ops.push({ type: 'retain', count: position });
    }
    
    ops.push({ type: 'insert', text });
    
    if (position < contentLength) {
      ops.push({ type: 'retain', count: contentLength - position });
    }

    return ops;
  }

  static createDeleteOp(position: number, length: number, contentLength: number): TextOperation[] {
    const ops: TextOperation[] = [];
    
    if (position > 0) {
      ops.push({ type: 'retain', count: position });
    }
    
    ops.push({ type: 'delete', count: length });
    
    if (position + length < contentLength) {
      ops.push({ type: 'retain', count: contentLength - position - length });
    }

    return ops;
  }

  static diff(oldContent: string, newContent: string): TextOperation[] {
    // Simple diff algorithm - in production use a more sophisticated one
    const ops: TextOperation[] = [];
    
    let i = 0;
    const minLength = Math.min(oldContent.length, newContent.length);
    
    // Find common prefix
    while (i < minLength && oldContent[i] === newContent[i]) {
      i++;
    }
    
    if (i > 0) {
      ops.push({ type: 'retain', count: i });
    }
    
    // Find common suffix
    let j = 0;
    while (
      j < minLength - i && 
      oldContent[oldContent.length - 1 - j] === newContent[newContent.length - 1 - j]
    ) {
      j++;
    }
    
    const deleteCount = oldContent.length - i - j;
    const insertText = newContent.slice(i, newContent.length - j);
    
    if (deleteCount > 0) {
      ops.push({ type: 'delete', count: deleteCount });
    }
    
    if (insertText.length > 0) {
      ops.push({ type: 'insert', text: insertText });
    }
    
    if (j > 0) {
      ops.push({ type: 'retain', count: j });
    }
    
    return ops;
  }
}

export class DocumentManager {
  private content: string;
  private version: number;
  private pendingOperations: Map<string, TextOperation[]> = new Map();

  constructor(initialContent: string = '', initialVersion: number = 0) {
    this.content = initialContent;
    this.version = initialVersion;
  }

  getContent(): string {
    return this.content;
  }

  getVersion(): number {
    return this.version;
  }

  applyOperation(clientId: string, operations: TextOperation[], clientVersion: number): {
    success: boolean;
    transformedOps?: TextOperation[];
    newVersion: number;
    newContent: string;
  } {
    try {
      let transformedOps = operations;

      // Transform against any pending operations from other clients
      for (const [otherId, otherOps] of this.pendingOperations) {
        if (otherId !== clientId) {
          const [transformed, _] = OperationalTransform.transform(transformedOps, otherOps);
          transformedOps = transformed;
        }
      }

      // Apply the transformed operations
      this.content = OperationalTransform.apply(this.content, transformedOps);
      this.version++;

      // Store this operation as pending
      this.pendingOperations.set(clientId, transformedOps);

      return {
        success: true,
        transformedOps,
        newVersion: this.version,
        newContent: this.content,
      };
    } catch (error) {
      return {
        success: false,
        newVersion: this.version,
        newContent: this.content,
      };
    }
  }

  acknowledgeOperation(clientId: string): void {
    this.pendingOperations.delete(clientId);
  }

  getState(): DocumentState {
    return {
      content: this.content,
      version: this.version,
    };
  }
}