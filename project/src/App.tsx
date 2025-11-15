import { useState, useEffect } from 'react';
import { LogOut } from 'lucide-react';
import { supabase } from './lib/supabase';
import { Auth } from './components/Auth';
import { UploadConversation } from './components/UploadConversation';
import { ConversationList } from './components/ConversationList';
import { AnalysisReport } from './components/AnalysisReport';

function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSelectedConversationId(null);
  };

  const handleUploadSuccess = () => {
    setRefreshKey((k) => k + 1);
    setSelectedConversationId(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user) {
    return <Auth onSuccess={() => setRefreshKey((k) => k + 1)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">ConvAnalyze</h1>
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-600">{user.email}</p>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 font-medium hover:bg-gray-100 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="space-y-8">
              <UploadConversation onSuccess={handleUploadSuccess} />

              {selectedConversationId && (
                <div className="bg-white rounded-lg shadow-lg p-8">
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">Analysis Report</h2>
                    <button
                      onClick={() => setSelectedConversationId(null)}
                      className="text-gray-500 hover:text-gray-700 text-xl font-bold"
                    >
                      ✕
                    </button>
                  </div>
                  <AnalysisReport conversationId={selectedConversationId} />
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Conversations</h2>
              <ConversationList
                onSelect={setSelectedConversationId}
                refreshKey={refreshKey}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
