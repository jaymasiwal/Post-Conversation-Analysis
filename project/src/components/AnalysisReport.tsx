import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  MessageCircle,
  Loader,
} from 'lucide-react';
import { supabase, ConversationAnalysis, Conversation } from '../lib/supabase';

interface AnalysisReportProps {
  conversationId: string;
}

export function AnalysisReport({ conversationId }: AnalysisReportProps) {
  const [analysis, setAnalysis] = useState<ConversationAnalysis | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAnalysis();
  }, [conversationId]);

  const loadAnalysis = async () => {
    setLoading(true);
    setError('');

    try {
      const { data: analysisData, error: anaError } = await supabase
        .from('conversation_analyses')
        .select('*')
        .eq('conversation_id', conversationId)
        .maybeSingle();

      if (anaError) throw anaError;

      if (!analysisData) {
        setError('No analysis found. Try triggering analysis first.');
        setAnalysis(null);
      } else {
        setAnalysis(analysisData);
      }

      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (convError) throw convError;
      setConversation(convData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analysis');
    } finally {
      setLoading(false);
    }
  };

  const triggerAnalysis = async () => {
    setLoading(true);
    setError('');

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-conversation`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ conversation_id: conversationId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      await loadAnalysis();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger analysis');
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

  return (
    <div className="space-y-6">
      {conversation && (
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
          <h2 className="text-2xl font-bold text-gray-900">{conversation.title}</h2>
          <p className="text-sm text-gray-500 mt-1">
            Created {new Date(conversation.created_at).toLocaleDateString()}
          </p>
        </div>
      )}

      {!analysis && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <MessageCircle className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-900 mb-2">No Analysis Yet</h3>
          <p className="text-gray-700 mb-4">Click the button below to analyze this conversation</p>
          <button
            onClick={triggerAnalysis}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
          >
            Trigger Analysis
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-900">{error}</p>
        </div>
      )}

      {analysis && (
        <>
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-lg p-8 text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">Overall Satisfaction Score</h3>
              <TrendingUp className="w-6 h-6" />
            </div>
            <p className="text-5xl font-bold">
              {analysis.overall_satisfaction_score.toFixed(1)}
              <span className="text-3xl ml-2">/100</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <ScoreCard
              label="Clarity"
              score={analysis.clarity_score}
              icon="💡"
            />
            <ScoreCard
              label="Relevance"
              score={analysis.relevance_score}
              icon="🎯"
            />
            <ScoreCard
              label="Accuracy"
              score={analysis.accuracy_score}
              icon="✓"
            />
            <ScoreCard
              label="Completeness"
              score={analysis.completeness_score}
              icon="📦"
            />
            <ScoreCard
              label="Empathy"
              score={analysis.empathy_score}
              icon="❤️"
            />
            <ScoreCard
              label="Response Time"
              score={analysis.response_time_avg}
              icon="⚡"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4">Sentiment</h4>
              <div className={`inline-block px-4 py-2 rounded-lg font-semibold ${
                analysis.sentiment === 'positive'
                  ? 'bg-green-100 text-green-800'
                  : analysis.sentiment === 'negative'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
              }`}>
                {analysis.sentiment.charAt(0).toUpperCase() + analysis.sentiment.slice(1)}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4">Fallbacks</h4>
              <p className="text-3xl font-bold text-blue-600">{analysis.fallback_frequency}</p>
              <p className="text-xs text-gray-500 mt-1">times AI said "I don't know"</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <ResolutionCard
              label="Resolution"
              resolved={analysis.resolution_rate}
              icon={<CheckCircle className="w-6 h-6" />}
            />
            <ResolutionCard
              label="Escalation Needed"
              resolved={analysis.escalation_needed}
              icon={<AlertCircle className="w-6 h-6" />}
              variant="warning"
            />
          </div>

          <button
            onClick={triggerAnalysis}
            className="w-full px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition"
          >
            Re-analyze
          </button>
        </>
      )}
    </div>
  );
}

interface ScoreCardProps {
  label: string;
  score: number;
  icon: string;
}

function ScoreCard({ label, score, icon }: ScoreCardProps) {
  const getColor = (score: number) => {
    if (score >= 80) return 'from-green-400 to-green-500';
    if (score >= 60) return 'from-yellow-400 to-yellow-500';
    return 'from-red-400 to-red-500';
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-900">{label}</h4>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="relative w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${getColor(score)} transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-sm text-gray-600 mt-2 font-semibold">{score.toFixed(1)}/100</p>
    </div>
  );
}

interface ResolutionCardProps {
  label: string;
  resolved: boolean;
  icon: React.ReactNode;
  variant?: 'default' | 'warning';
}

function ResolutionCard({
  label,
  resolved,
  icon,
  variant = 'default',
}: ResolutionCardProps) {
  const bgColor =
    variant === 'warning'
      ? resolved
        ? 'bg-orange-50 border-orange-200'
        : 'bg-green-50 border-green-200'
      : resolved
        ? 'bg-green-50 border-green-200'
        : 'bg-gray-50 border-gray-200';

  const iconColor =
    variant === 'warning'
      ? resolved
        ? 'text-orange-600'
        : 'text-green-600'
      : resolved
        ? 'text-green-600'
        : 'text-gray-600';

  const statusText =
    variant === 'warning'
      ? resolved
        ? 'Yes, needs escalation'
        : 'No escalation needed'
      : resolved
        ? 'Yes, resolved'
        : 'Not resolved';

  return (
    <div className={`rounded-lg shadow p-6 border ${bgColor}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={iconColor}>{icon}</div>
        <h4 className="font-semibold text-gray-900">{label}</h4>
      </div>
      <p className="font-semibold text-gray-700">{statusText}</p>
    </div>
  );
}
