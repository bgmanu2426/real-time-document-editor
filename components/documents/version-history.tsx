'use client';

import React, { useState, useEffect } from 'react';
import { formatDistance } from 'date-fns';
import Popup from '../ui/popup';
import { usePopup } from '../../hooks/use-popup';

interface DocumentVersion {
  id: number;
  documentId: number;
  version: number;
  content: string;
  branchName: string;
  commitMessage: string | null;
  createdAt: string;
  author?: {
    id: number;
    name: string | null;
    email: string;
  };
}

interface VersionHistoryProps {
  documentId: string;
  isOpen: boolean;
  onClose: () => void;
  onRestore: (content: string) => void;
}

const VersionHistory: React.FC<VersionHistoryProps> = ({
  documentId,
  isOpen,
  onClose,
  onRestore,
}) => {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<DocumentVersion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const { popup, hidePopup, showAlert, showConfirm } = usePopup();

  // Fetch version history
  const fetchVersionHistory = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/documents/${documentId}/versions`);
      if (response.ok) {
        const data = await response.json();
        setVersions(data.data || []);
        if (data.data && data.data.length > 0) {
          setSelectedVersion(data.data[0]); // Select latest version by default
        }
      } else {
        console.error('Failed to fetch version history');
      }
    } catch (error) {
      console.error('Error fetching version history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load versions when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchVersionHistory();
    }
  }, [isOpen, documentId]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle version restoration
  const handleRestoreVersion = async (version: DocumentVersion) => {
    showConfirm(
      `Are you sure you want to restore to version ${version.version}? This will create a new version with the restored content.`,
      async () => {
        try {
          // Create a new version with the restored content
          const response = await fetch(`/api/documents/${documentId}/versions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              content: version.content,
              commitMessage: `Restored from version ${version.version}`,
              branchName: 'main',
            }),
          });
          
          if (response.ok) {
            onRestore(version.content);
            fetchVersionHistory(); // Refresh the version list
            onClose();
            showAlert('Version restored successfully! The document has been updated.', 'success');
          } else {
            showAlert('Failed to restore version. Please try again.', 'error');
          }
        } catch (error) {
          console.error('Error restoring version:', error);
          showAlert('An error occurred while restoring the version.', 'error');
        }
      },
      {
        title: 'Restore Version',
        confirmLabel: 'Restore',
        cancelLabel: 'Cancel',
        type: 'warning'
      }
    );
  };

  // Get a summary of the version content
  const getVersionSummary = (content: string) => {
    const textContent = content.replace(/<[^>]*>/g, '').trim();
    return textContent.length > 100 ? textContent.substring(0, 100) + '...' : textContent;
  };

  // Calculate detailed diff information
  const calculateContentDiff = (oldContent: string, newContent: string) => {
    const oldText = oldContent.replace(/<[^>]*>/g, '').trim();
    const newText = newContent.replace(/<[^>]*>/g, '').trim();
    
    if (oldText === newText) {
      return { type: 'no-change', summary: 'No changes', details: null };
    }

    const lengthDiff = newText.length - oldText.length;
    const words = newText.split(/\s+/).length - oldText.split(/\s+/).length;
    
    let changeType = 'modified';
    let summary = '';
    
    if (lengthDiff > 100) {
      changeType = 'major-addition';
      summary = `+${lengthDiff} characters, +${Math.max(0, words)} words`;
    } else if (lengthDiff < -100) {
      changeType = 'major-deletion';
      summary = `${lengthDiff} characters, ${Math.min(0, words)} words`;
    } else if (lengthDiff > 0) {
      changeType = 'addition';
      summary = `+${lengthDiff} characters`;
    } else if (lengthDiff < 0) {
      changeType = 'deletion';
      summary = `${lengthDiff} characters`;
    } else {
      changeType = 'modification';
      summary = 'Content modified';
    }
    
    return {
      type: changeType,
      summary,
      details: {
        charDiff: lengthDiff,
        wordDiff: words,
        oldLength: oldText.length,
        newLength: newText.length
      }
    };
  };

  // Generate visual diff between two content versions
  const generateVisualDiff = (oldContent: string, newContent: string) => {
    const oldText = oldContent.replace(/<[^>]*>/g, '').trim();
    const newText = newContent.replace(/<[^>]*>/g, '').trim();
    
    if (oldText === newText) {
      return [];
    }
    
    // Simple word-based diff implementation
    const oldWords = oldText.split(/\s+/);
    const newWords = newText.split(/\s+/);
    const changes = [];
    
    let oldIndex = 0;
    let newIndex = 0;
    
    while (oldIndex < oldWords.length || newIndex < newWords.length) {
      if (oldIndex >= oldWords.length) {
        // Only new words remain
        changes.push({
          type: 'addition',
          content: newWords.slice(newIndex).join(' '),
          position: newIndex
        });
        break;
      } else if (newIndex >= newWords.length) {
        // Only old words remain
        changes.push({
          type: 'deletion',
          content: oldWords.slice(oldIndex).join(' '),
          position: oldIndex
        });
        break;
      } else if (oldWords[oldIndex] === newWords[newIndex]) {
        // Words match, continue
        oldIndex++;
        newIndex++;
      } else {
        // Words differ, determine the type of change
        let found = false;
        
        // Look ahead in new words to see if current old word appears later
        for (let i = newIndex + 1; i < Math.min(newIndex + 5, newWords.length); i++) {
          if (oldWords[oldIndex] === newWords[i]) {
            changes.push({
              type: 'addition',
              content: newWords.slice(newIndex, i).join(' '),
              position: newIndex
            });
            newIndex = i;
            found = true;
            break;
          }
        }
        
        if (!found) {
          // Look ahead in old words to see if current new word appears later
          for (let i = oldIndex + 1; i < Math.min(oldIndex + 5, oldWords.length); i++) {
            if (oldWords[i] === newWords[newIndex]) {
              changes.push({
                type: 'deletion',
                content: oldWords.slice(oldIndex, i).join(' '),
                position: oldIndex
              });
              oldIndex = i;
              found = true;
              break;
            }
          }
        }
        
        if (!found) {
          // No match found, treat as replacement
          changes.push({
            type: 'replacement',
            oldContent: oldWords[oldIndex],
            newContent: newWords[newIndex],
            position: oldIndex
          });
          oldIndex++;
          newIndex++;
        }
      }
    }
    
    return changes;
  };

  const getDiffStats = (version: DocumentVersion, previousVersion: DocumentVersion | null) => {
    if (!previousVersion) return { type: 'initial', summary: 'Initial version', details: null };
    return calculateContentDiff(previousVersion.content, version.content);
  };

  // Get change type icon and color
  const getChangeTypeStyle = (changeType: string) => {
    switch (changeType) {
      case 'major-addition':
        return { icon: '++', color: 'text-green-600', bg: 'bg-green-50' };
      case 'addition':
        return { icon: '+', color: 'text-green-500', bg: 'bg-green-50' };
      case 'major-deletion':
        return { icon: '--', color: 'text-red-600', bg: 'bg-red-50' };
      case 'deletion':
        return { icon: '-', color: 'text-red-500', bg: 'bg-red-50' };
      case 'modification':
        return { icon: '~', color: 'text-blue-500', bg: 'bg-blue-50' };
      case 'initial':
        return { icon: '•', color: 'text-gray-500', bg: 'bg-gray-50' };
      default:
        return { icon: '=', color: 'text-gray-400', bg: 'bg-gray-50' };
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl">
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
          <h3 className="text-lg font-medium text-foreground">Version History</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-accent"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-muted-foreground">Loading version history...</span>
            </div>
          ) : (
            versions.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-center text-muted-foreground py-8">No version history available.</p>
              </div>
            ) : (
              <div className="h-full flex">
                {/* Version List */}
                <div className="w-1/2 border-r border-border flex flex-col">
                  <div className="p-4 pb-2 flex-shrink-0">
                    <h4 className="text-sm font-medium text-foreground">Versions ({versions.length})</h4>
                  </div>
                  <div className="flex-1 overflow-y-auto px-4 pb-4">
                    <div className="space-y-2">
                      {versions.map((version, index) => {
                        const previousVersion = versions[index + 1] || null;
                        const isLatest = index === 0;
                        
                        return (
                          <div
                            key={version.id}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedVersion?.id === version.id
                                ? 'border-primary bg-primary/5'
                                : 'border-border bg-muted/30 hover:bg-muted/50'
                            }`}
                            onClick={() => setSelectedVersion(version)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="text-sm font-medium text-foreground">
                                    Version {version.version}
                                  </span>
                                  {isLatest && (
                                    <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                                      Current
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mb-2">
                                  {version.author?.name || version.author?.email || 'Unknown'}
                                  {' • '}
                                  {formatDistance(new Date(version.createdAt), new Date(), { addSuffix: true })}
                                </p>
                                {version.commitMessage && (
                                  <p className="text-sm text-foreground mb-2 font-medium">
                                    {version.commitMessage}
                                  </p>
                                )}
                                <div className="flex items-center space-x-2">
                                  {(() => {
                                    const diffStats = getDiffStats(version, previousVersion);
                                    const style = getChangeTypeStyle(diffStats.type);
                                    return (
                                      <>
                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${style.bg} ${style.color}`}>
                                          {style.icon}
                                        </span>
                                        <p className="text-xs text-muted-foreground">
                                          {diffStats.summary}
                                        </p>
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>
                            
                            <div className="mt-2 pt-2 border-t border-border/50">
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {getVersionSummary(version.content)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Version Preview */}
                <div className="w-1/2 flex flex-col">
                  {selectedVersion ? (
                    <div className="h-full flex flex-col">
                      <div className="p-4 pb-2 border-b border-border flex-shrink-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-foreground">
                            Version {selectedVersion.version} Preview
                          </h4>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setShowDiff(!showDiff)}
                              className="px-3 py-1 text-xs border border-input rounded-md bg-background hover:bg-accent text-foreground"
                            >
                              {showDiff ? 'Hide Changes' : 'Show Changes'}
                            </button>
                            {selectedVersion.id !== versions[0]?.id && (
                              <button
                                onClick={() => handleRestoreVersion(selectedVersion)}
                                className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                              >
                                Restore This Version
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto p-4 bg-muted/20">
                        {showDiff ? (
                          <div className="space-y-4">
                            <div>
                              <h5 className="text-sm font-medium text-foreground mb-2">Version Info</h5>
                              <div className="text-sm text-muted-foreground space-y-1">
                                <p><strong>Author:</strong> {selectedVersion.author?.name || selectedVersion.author?.email}</p>
                                <p><strong>Date:</strong> {new Date(selectedVersion.createdAt).toLocaleString()}</p>
                                <p><strong>Branch:</strong> {selectedVersion.branchName}</p>
                                {selectedVersion.commitMessage && (
                                  <p><strong>Message:</strong> {selectedVersion.commitMessage}</p>
                                )}
                              </div>
                            </div>
                            
                            {(() => {
                              const previousVersion = versions.find((v, index) => 
                                versions[index - 1]?.id === selectedVersion.id
                              );
                              
                              if (!previousVersion) {
                                return (
                                  <div>
                                    <h5 className="text-sm font-medium text-foreground mb-2">Initial Version</h5>
                                    <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                                      <p className="text-sm text-blue-700">This is the first version of the document.</p>
                                      <p className="text-xs text-blue-600 mt-1">
                                        Content length: {selectedVersion.content.replace(/<[^>]*>/g, '').length} characters
                                      </p>
                                    </div>
                                  </div>
                                );
                              }
                              
                              const diffStats = getDiffStats(selectedVersion, previousVersion);
                              const changes = generateVisualDiff(previousVersion.content, selectedVersion.content);
                              
                              return (
                                <div>
                                  <h5 className="text-sm font-medium text-foreground mb-2">Changes Made</h5>
                                  <div className="space-y-2">
                                    <div className="flex items-center space-x-2 p-2 bg-muted/50 rounded">
                                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                        getChangeTypeStyle(diffStats.type).bg
                                      } ${
                                        getChangeTypeStyle(diffStats.type).color
                                      }`}>
                                        {getChangeTypeStyle(diffStats.type).icon} {diffStats.summary}
                                      </span>
                                    </div>
                                    
                                    {diffStats.details && (
                                      <div className="grid grid-cols-2 gap-4 text-xs">
                                        <div className="p-2 bg-red-50 border border-red-200 rounded">
                                          <p className="font-medium text-red-700">Before</p>
                                          <p className="text-red-600">{diffStats.details.oldLength} characters</p>
                                        </div>
                                        <div className="p-2 bg-green-50 border border-green-200 rounded">
                                          <p className="font-medium text-green-700">After</p>
                                          <p className="text-green-600">{diffStats.details.newLength} characters</p>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {changes.length > 0 && (
                                      <div className="mt-3">
                                        <h6 className="text-xs font-medium text-foreground mb-2">Detailed Changes ({changes.length})</h6>
                                        <div className="space-y-1 max-h-40 overflow-y-auto border border-border/30 rounded p-2 bg-background/50">
                                          {changes.slice(0, 5).map((change, index) => (
                                            <div key={index} className="text-xs">
                                              {change.type === 'addition' && change.content && (
                                                <div className="p-1 bg-green-50 border-l-2 border-green-400 text-green-700">
                                                  <span className="font-medium">+ Added:</span> {change.content.substring(0, 50)}
                                                  {change.content.length > 50 && '...'}
                                                </div>
                                              )}
                                              {change.type === 'deletion' && change.content && (
                                                <div className="p-1 bg-red-50 border-l-2 border-red-400 text-red-700">
                                                  <span className="font-medium">- Removed:</span> {change.content.substring(0, 50)}
                                                  {change.content.length > 50 && '...'}
                                                </div>
                                              )}
                                              {change.type === 'replacement' && (
                                                <div className="p-1 bg-blue-50 border-l-2 border-blue-400 text-blue-700">
                                                  <span className="font-medium">~ Changed:</span> "{change.oldContent}" → "{change.newContent}"
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                          {changes.length > 5 && (
                                            <p className="text-xs text-muted-foreground italic">
                                              ... and {changes.length - 5} more changes
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        ) : (
                          <div 
                            className="prose prose-sm max-w-none text-foreground"
                            dangerouslySetInnerHTML={{ __html: selectedVersion.content }}
                          />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-muted-foreground">Select a version to preview its content</p>
                    </div>
                  )}
                </div>
              </div>
            )
          )}
        </div>
        
        {/* Fixed Footer */}
        <div className="p-4 border-t border-border flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-input rounded-md bg-background hover:bg-accent text-foreground"
          >
            Close
          </button>
        </div>
      </div>
      
      {/* Popup Component */}
      <Popup
        isOpen={popup.isOpen}
        onClose={hidePopup}
        title={popup.title}
        message={popup.message}
        type={popup.type}
        actions={popup.actions}
      />
    </div>
  );
};

export default VersionHistory;