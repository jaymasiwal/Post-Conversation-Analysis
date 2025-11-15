/*
  # Post-Conversation Analysis Schema

  ## Overview
  This migration creates a complete schema for storing and analyzing chat conversations.
  Conversations consist of messages between users and AI, with comprehensive analysis metrics.

  ## New Tables

  1. **conversations**
     - `id`: UUID primary key
     - `title`: Descriptive title for the conversation
     - `created_at`: Timestamp when conversation was created
     - `analyzed_at`: Timestamp when analysis was performed
     - Tracks individual conversations

  2. **messages**
     - `id`: UUID primary key
     - `conversation_id`: Foreign key to conversations
     - `sender`: 'user' or 'ai'
     - `content`: The actual message text
     - `created_at`: Timestamp of the message
     - Stores individual messages within conversations

  3. **conversation_analyses**
     - `id`: UUID primary key
     - `conversation_id`: One-to-one relationship with conversations
     - **Quality Metrics**: clarity_score, relevance_score, accuracy_score, completeness_score
     - **Interaction Metrics**: sentiment, empathy_score, response_time_avg
     - **Resolution Metrics**: resolution_rate, escalation_needed
     - **Operations Metrics**: fallback_frequency
     - **Overall**: overall_satisfaction_score
     - Stores all analysis results for a conversation

  ## Security
  - RLS enabled on all tables
  - Users can only view/create their own conversations
  - Service role can perform automated analysis

  ## Important Notes
  - All timestamps use UTC
  - Scores are floats between 0-100
  - Sentiment values: 'positive', 'neutral', 'negative'
  - Response time is in seconds (average between messages)
*/

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  analyzed_at TIMESTAMPTZ,
  user_id UUID,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender VARCHAR(20) NOT NULL CHECK (sender IN ('user', 'ai')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversation_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL UNIQUE REFERENCES conversations(id) ON DELETE CASCADE,
  
  clarity_score FLOAT NOT NULL DEFAULT 0,
  relevance_score FLOAT NOT NULL DEFAULT 0,
  accuracy_score FLOAT NOT NULL DEFAULT 0,
  completeness_score FLOAT NOT NULL DEFAULT 0,
  
  sentiment VARCHAR(20) NOT NULL DEFAULT 'neutral',
  empathy_score FLOAT NOT NULL DEFAULT 0,
  response_time_avg FLOAT NOT NULL DEFAULT 0,
  
  resolution_rate BOOLEAN NOT NULL DEFAULT false,
  escalation_needed BOOLEAN NOT NULL DEFAULT false,
  
  fallback_frequency INT NOT NULL DEFAULT 0,
  
  overall_satisfaction_score FLOAT NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON conversations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own conversation messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages in own conversations"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own conversation analyses"
  ON conversation_analyses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_analyses.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create analysis for own conversations"
  ON conversation_analyses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update analysis for own conversations"
  ON conversation_analyses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_analyses.conversation_id
      AND conversations.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_analyses_conversation_id ON conversation_analyses(conversation_id);
CREATE INDEX idx_conversations_analyzed_at ON conversations(analyzed_at);
