"use client";

import { useState, useEffect } from 'react';
import { X, MessageSquare, Trash2, MoreVertical, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function ChatHistory({ 
  isOpen, 
  onClose, 
  onSelectConversation, 
  currentConversationId 
}) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchConversations();
    }
  }, [isOpen]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      console.log("Fetching conversations...");
      const response = await fetch('/api/conversations');
      console.log("Response status:", response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log("Conversations data:", data);
        setConversations(data.conversations || []);
      } else {
        console.error("Failed to fetch conversations:", response.statusText);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteConversation = async (conversationId, e) => {
    e.stopPropagation();
    
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      try {
        const response = await fetch(`/api/conversations/${conversationId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setConversations(prev => prev.filter(conv => conv.id !== conversationId));
          
          // If deleted conversation was current, close it
          if (currentConversationId === conversationId) {
            onSelectConversation(null);
          }
        } else {
          console.error("Failed to delete conversation");
        }
      } catch (error) {
        console.error('Error deleting conversation:', error);
      }
    }
  };

  const clearAllConversations = async () => {
    if (window.confirm('Are you sure you want to delete all conversations? This cannot be undone.')) {
      try {
        const response = await fetch('/api/conversations/clear', {
          method: 'DELETE',
        });

        if (response.ok) {
          setConversations([]);
          onSelectConversation(null);
        } else {
          console.error("Failed to clear conversations");
        }
      } catch (error) {
        console.error('Error clearing conversations:', error);
      }
    }
  };

  const startEditing = (conversation, e) => {
    e.stopPropagation();
    setEditingId(conversation.id);
    setEditingTitle(conversation.title);
  };

  const saveEdit = async (conversationId) => {
    if (editingTitle.trim()) {
      try {
        const response = await fetch('/api/conversations', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: conversationId,
            title: editingTitle.trim(),
          }),
        });

        if (response.ok) {
          setConversations(prev => 
            prev.map(conv => 
              conv.id === conversationId 
                ? { ...conv, title: editingTitle.trim() }
                : conv
            )
          );
        } else {
          console.error("Failed to update conversation title");
        }
      } catch (error) {
        console.error('Error updating conversation:', error);
      }
    }
    setEditingId(null);
    setEditingTitle('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const handleConversationSelect = async (conversation) => {
    try {
      console.log("Selected conversation:", conversation);
      
      if (!conversation || !conversation.id) {
        console.error("Invalid conversation object:", conversation);
        return;
      }

      console.log("Fetching conversation details for ID:", conversation.id);
      const response = await fetch(`/api/conversations/${conversation.id}`);
      console.log("Conversation detail response status:", response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log("Conversation detail data:", data);
        
        if (!data.conversation) {
          console.error("No conversation in response:", data);
          return;
        }

        const conversationData = data.conversation;
        
        // Ensure messages exist and is an array
        if (!conversationData.messages || !Array.isArray(conversationData.messages)) {
          console.error("Invalid messages data:", conversationData.messages);
          conversationData.messages = [];
        }
        
        // Convert messages back to the format expected by your chat
        const formattedMessages = conversationData.messages.map(msg => ({
          role: msg.role,
          text: msg.content,
        }));
        
        console.log("Formatted messages:", formattedMessages);
        
        onSelectConversation({
          ...conversationData,
          messages: formattedMessages,
        });
      } else {
        const errorData = await response.json();
        console.error("Failed to load conversation:", errorData);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  return (
    <div className={`
      fixed top-0 left-0 h-full bg-white border-r border-gray-200 shadow-lg z-50
      transform transition-transform duration-300 ease-in-out
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      w-80
    `}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">Chat History</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Clear all button */}
      <div className="p-4 border-b border-gray-200">
        <Button
          onClick={clearAllConversations}
          variant="destructive"
          size="sm"
          className="w-full"
          disabled={conversations.length === 0}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Clear All History
        </Button>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500">Loading...</div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No conversations yet</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {conversations.map(conversation => (
              <div
                key={conversation.id}
                className={`
                  group relative p-3 rounded-lg cursor-pointer transition-colors
                  hover:bg-gray-100
                  ${currentConversationId === conversation.id ? 'bg-blue-50 border border-blue-200' : ''}
                `}
                onClick={() => handleConversationSelect(conversation)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {editingId === conversation.id ? (
                      <Input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={() => saveEdit(conversation.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit(conversation.id);
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        className="text-sm"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {conversation.title}
                      </h3>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {format(new Date(conversation.updatedAt), 'MMM d, yyyy')}
                    </p>
                    {conversation.messages && conversation.messages[0] && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                        {(conversation.messages[0].content || conversation.messages[0].text || '').slice(0, 60)}...
                      </p>
                    )}
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => startEditing(conversation, e)}>
                        <Edit2 className="h-3 w-3 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => deleteConversation(conversation.id, e)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-3 w-3 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}