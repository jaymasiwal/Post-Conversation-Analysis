import React, { useState } from 'react';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase, Message } from '../lib/supabase';

interface UploadConversationProps {
  onSuccess: () => void;
}

export function UploadConversation({ onSuccess }: UploadConversationProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [title, setTitle] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [jsonInput, setJsonInput] = useState('');

  const handleJsonPaste = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (!Array.isArray(parsed)) {
        throw new Error('JSON must be an array of messages');
      }
      setMessages(parsed);
      setError('');
      setSuccess(`Loaded ${parsed.length} messages`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON');
      setSuccess('');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!Array.isArray(json)) {
          throw new Error('JSON must be an array of messages');
        }
        setMessages(json);
        setError('');
        setSuccess(`Loaded ${json.length} messages from file`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse file');
        setSuccess('');
      }
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (!title.trim()) {
      setError('Please enter a conversation title');
      return;
    }
    if (messages.length === 0) {
      setError('Please load messages first');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          title,
          user_id: user.id,
        })
        .select('id')
        .single();

      if (convError) throw convError;

      const messageInserts = messages.map((msg) => ({
        conversation_id: conversation.id,
        sender: msg.sender,
        content: msg.message || msg.content,
      }));

      const { error: msgError } = await supabase
        .from('messages')
        .insert(messageInserts);

      if (msgError) throw msgError;

      setSuccess(
        `Conversation "${title}" uploaded successfully! Analyzing...`
      );
      setTitle('');
      setMessages([]);
      setJsonInput('');

      setTimeout(() => {
        onSuccess();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Upload className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Upload Conversation</h2>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Conversation Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Customer Support - Order Issue"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Upload JSON File
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Or paste JSON
            </label>
            <button
              onClick={handleJsonPaste}
              className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition"
            >
              Parse JSON
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            JSON Input
          </label>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder={JSON.stringify(
              [
                { sender: 'user', message: 'Hi, I need help with my order.' },
                { sender: 'ai', message: 'Sure, can you please share your order ID?' },
              ],
              null,
              2
            )}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm h-48"
          />
        </div>

        {messages.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-900">
              ✓ {messages.length} messages loaded
            </p>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-900">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-4">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-900">{success}</p>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={loading || messages.length === 0 || !title.trim()}
          className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition"
        >
          {loading ? 'Uploading...' : 'Upload & Analyze'}
        </button>
      </div>
    </div>
  );
}
