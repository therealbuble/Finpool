"use client";
// app/(main)/finguy/components/ChatHistory.js
import { useState, useEffect } from 'react';
import { Transition } from '@headlessui/react';
import { X, MessageSquare } from 'lucide-react'

import { useState, useEffect } from 'react';

export default function ChatHistory() {
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/conversations');
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const clearAllConversations = async () => {
    try {
      const response = await fetch('/api/conversations/clear', {
        method: 'DELETE',
      });

      if (response.ok) {
        setConversations([]);
        alert('All conversations deleted successfully');
      } else {
        alert('Failed to delete conversations');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error deleting conversations');
    }
  };

  const deleteConversation = async (conversationId) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setConversations(prev => prev.filter(conv => conv.id !== conversationId));
        alert('Conversation deleted successfully');
      } else {
        alert('Failed to delete conversation');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error deleting conversation');
    }
  };

  const clearAllWithConfirmation = () => {
    if (window.confirm('Are you sure you want to delete all conversations? This cannot be undone.')) {
      clearAllConversations();
    }
  };

  const deleteWithConfirmation = (conversationId, title) => {
    if (window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      deleteConversation(conversationId);
    }
  };

  return (
    <div className="w-64 bg-gray-100 p-4 h-full">
      <div className="mb-4">
        <button 
          onClick={clearAllWithConfirmation}
          className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 text-sm"
        >
          Clear All History
        </button>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {conversations.length === 0 ? (
          <p className="text-gray-500 text-sm">No conversations yet</p>
        ) : (
          conversations.map(conversation => (
            <div key={conversation.id} className="bg-white rounded p-2 shadow-sm">
              <div 
                className="cursor-pointer hover:text-blue-600 text-sm truncate mb-2"
                onClick={() => {
                  console.log('Selected conversation:', conversation);
                }}
                title={conversation.title}
              >
                {conversation.title}
              </div>
              
              <button 
                onClick={() => deleteWithConfirmation(conversation.id, conversation.title)}
                className="w-full bg-red-400 text-white px-2 py-1 rounded text-xs hover:bg-red-500"
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}