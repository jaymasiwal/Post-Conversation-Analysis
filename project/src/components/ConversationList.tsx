import React, { useEffect, useState } from 'react';
import { MessageSquare, Loader, AlertCircle } from 'lucide-react';
import { supabase, Conversation } from '../lib/supabase';

interface ConversationListProps {
  onSelect: (id: string) => void;
  refreshKey?: number;
}

export function ConversationList({ onSelect, refreshKey }: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadConversations();
  }, [refreshKey]);

  const loadConversations = async () => {
    setLoading(true);
    setError('');

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error: err } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (err) throw err;
      setConversations(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-red-900">{error}</p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No conversations yet. Upload one to get started!</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {conversations.map((conv) => (
        <button
          key={conv.id}
          onClick={() => onSelect(conv.id)}
          className="text-left p-4 bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg transition cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{conv.title}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {new Date(conv.created_at).toLocaleDateString()}
              </p>
            </div>
            {conv.analyzed_at && (
              <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                Analyzed
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
