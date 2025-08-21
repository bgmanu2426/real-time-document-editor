'use client';

import { useCallback, useRef, useEffect } from 'react';

// Simple debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T & { cancel: () => void } {
  let timeoutId: NodeJS.Timeout | null = null;
  
  const debouncedFn = ((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      func(...args);
    }, wait);
  }) as T & { cancel: () => void };
  
  debouncedFn.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };
  
  return debouncedFn;
}

interface UseVersionTrackingProps {
  documentId: string;
  userId: number;
  username: string;
  onVersionCreated?: (version: any) => void;
}

interface VersionCreateOptions {
  content: string;
  commitMessage?: string;
  isAutoSave?: boolean;
}

export function useVersionTracking({
  documentId,
  userId,
  username,
  onVersionCreated,
}: UseVersionTrackingProps) {
  const lastContentRef = useRef<string>('');
  const lastSaveTimeRef = useRef<number>(0);
  const pendingChangesRef = useRef<boolean>(false);

  // Calculate content similarity (simple character-based diff)
  const calculateSimilarity = useCallback((oldContent: string, newContent: string): number => {
    if (oldContent === newContent) return 1;
    if (!oldContent || !newContent) return 0;
    
    const oldText = oldContent.replace(/<[^>]*>/g, '').trim();
    const newText = newContent.replace(/<[^>]*>/g, '').trim();
    
    if (oldText === newText) return 1;
    
    // Simple Levenshtein distance for similarity
    const maxLength = Math.max(oldText.length, newText.length);
    if (maxLength === 0) return 1;
    
    let distance = 0;
    const minLength = Math.min(oldText.length, newText.length);
    
    // Count differing characters
    for (let i = 0; i < minLength; i++) {
      if (oldText[i] !== newText[i]) distance++;
    }
    
    // Add length difference
    distance += Math.abs(oldText.length - newText.length);
    
    return 1 - (distance / maxLength);
  }, []);

  // Determine if changes are significant enough to create a version
  const shouldCreateVersion = useCallback((oldContent: string, newContent: string): boolean => {
    const similarity = calculateSimilarity(oldContent, newContent);
    const timeSinceLastSave = Date.now() - lastSaveTimeRef.current;
    
    // Create version if:
    // 1. Similarity is below 85% (significant changes)
    // 2. More than 30 seconds have passed since last save
    // 3. Content length difference is more than 100 characters
    const lengthDiff = Math.abs(
      newContent.replace(/<[^>]*>/g, '').length - 
      oldContent.replace(/<[^>]*>/g, '').length
    );
    
    return (
      similarity < 0.85 || 
      timeSinceLastSave > 30000 || 
      lengthDiff > 100
    );
  }, [calculateSimilarity]);

  // Create a new version
  const createVersion = useCallback(async (options: VersionCreateOptions) => {
    try {
      const response = await fetch(`/api/documents/${documentId}/versions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: options.content,
          commitMessage: options.commitMessage || (
            options.isAutoSave ? `Auto-save by ${username}` : `Changes by ${username}`
          ),
          branchName: 'main',
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        lastContentRef.current = options.content;
        lastSaveTimeRef.current = Date.now();
        pendingChangesRef.current = false;
        
        onVersionCreated?.(data.data);
        return data.data;
      } else {
        console.error('Failed to create version:', await response.text());
        return null;
      }
    } catch (error) {
      console.error('Error creating version:', error);
      return null;
    }
  }, [documentId, username, onVersionCreated]);

  // Debounced version creation for auto-saves
  const debouncedCreateVersion = useCallback(
    debounce(async (content: string) => {
      if (shouldCreateVersion(lastContentRef.current, content)) {
        await createVersion({ content, isAutoSave: true });
      } else {
        // Just update the last content without creating a version
        lastContentRef.current = content;
      }
    }, 2000), // 2 second debounce
    [shouldCreateVersion, createVersion]
  );

  // Track content changes with enhanced collaborator information
  const trackChange = useCallback((newContent: string, options?: { 
    immediate?: boolean; 
    commitMessage?: string;
    collaboratorName?: string;
    changeType?: string;
  }) => {
    pendingChangesRef.current = true;
    
    if (options?.immediate) {
      // Create version immediately (manual save)
      const commitMsg = options.commitMessage || 
        `${options.changeType || 'Changes'} made by ${options.collaboratorName || username}`;
      
      createVersion({
        content: newContent,
        commitMessage: commitMsg,
        isAutoSave: false,
      });
    } else {
      // Queue for auto-save with collaborator context
      debouncedCreateVersion(newContent);
    }
  }, [createVersion, debouncedCreateVersion, username]);

  // Force create version (manual save)
  const saveVersion = useCallback(async (content: string, commitMessage?: string) => {
    return await createVersion({
      content,
      commitMessage: commitMessage || `Manual save by ${username}`,
      isAutoSave: false,
    });
  }, [createVersion, username]);

  // Initialize with current content
  const initialize = useCallback((initialContent: string) => {
    lastContentRef.current = initialContent;
    lastSaveTimeRef.current = Date.now();
    pendingChangesRef.current = false;
  }, []);

  // Get enhanced stats about pending changes
  const getChangeStats = useCallback(() => {
    const timeSinceLastSave = Date.now() - lastSaveTimeRef.current;
    return {
      hasPendingChanges: pendingChangesRef.current,
      lastSaveTime: lastSaveTimeRef.current,
      timeSinceLastSave,
      shouldAutoSave: pendingChangesRef.current && timeSinceLastSave > 30000, // 30 seconds
      contentLength: lastContentRef.current.replace(/<[^>]*>/g, '').length,
    };
  }, []);

  // Enhanced method to trigger collaborative version creation
  const createCollaborativeVersion = useCallback(async (content: string, collaboratorInfo: {
    name: string;
    action: string;
    details?: string;
  }) => {
    const commitMessage = `${collaboratorInfo.action} by ${collaboratorInfo.name}${
      collaboratorInfo.details ? ` - ${collaboratorInfo.details}` : ''
    }`;
    
    return await createVersion({
      content,
      commitMessage,
      isAutoSave: false,
    });
  }, [createVersion]);

  // Cleanup debounced function on unmount
  useEffect(() => {
    return () => {
      debouncedCreateVersion.cancel();
    };
  }, [debouncedCreateVersion]);

  return {
    trackChange,
    saveVersion,
    initialize,
    getChangeStats,
    createVersion,
    createCollaborativeVersion,
  };
}