-- Create debate_rooms table
CREATE TABLE IF NOT EXISTS debate_rooms (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  rounds INTEGER NOT NULL DEFAULT 3,
  minutes_per_turn INTEGER NOT NULL DEFAULT 2,
  current_round INTEGER NOT NULL DEFAULT 1,
  current_turn TEXT CHECK (current_turn IN ('player1', 'player2')),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'ready', 'active', 'finished')),
  started_at TIMESTAMP WITH TIME ZONE,
  turn_started_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create debate_participants table
CREATE TABLE IF NOT EXISTS debate_participants (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES debate_rooms(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  player_role TEXT NOT NULL CHECK (player_role IN ('player1', 'player2', 'spectator')),
  is_ready BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, player_name)
);

-- Create debate_messages table
CREATE TABLE IF NOT EXISTS debate_messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES debate_rooms(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  content TEXT NOT NULL,
  round INTEGER NOT NULL,
  turn TEXT NOT NULL CHECK (turn IN ('player1', 'player2')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create debate_winners table for storing AI analysis results
CREATE TABLE IF NOT EXISTS debate_winners (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES debate_rooms(id) ON DELETE CASCADE,
  winner_name TEXT NOT NULL,
  winner_player TEXT NOT NULL CHECK (winner_player IN ('player1', 'player2')),
  score TEXT,
  summary TEXT,
  reasoning TEXT,
  analysis_data JSONB, -- Store the full parsed analysis
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_debate_rooms_status ON debate_rooms(status);
CREATE INDEX IF NOT EXISTS idx_debate_rooms_created_at ON debate_rooms(created_at);
CREATE INDEX IF NOT EXISTS idx_debate_participants_room_id ON debate_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_debate_messages_room_id ON debate_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_debate_messages_created_at ON debate_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_debate_winners_room_id ON debate_winners(room_id);

-- Enable Row Level Security (RLS)
ALTER TABLE debate_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE debate_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE debate_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE debate_winners ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public access (since we're not using auth)
CREATE POLICY "Allow public read access to debate_rooms" ON debate_rooms
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to debate_rooms" ON debate_rooms
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to debate_rooms" ON debate_rooms
  FOR UPDATE USING (true);

CREATE POLICY "Allow public read access to debate_participants" ON debate_participants
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to debate_participants" ON debate_participants
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to debate_participants" ON debate_participants
  FOR UPDATE USING (true);

CREATE POLICY "Allow public read access to debate_messages" ON debate_messages
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to debate_messages" ON debate_messages
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access to debate_winners" ON debate_winners
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to debate_winners" ON debate_winners
  FOR INSERT WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_debate_rooms_updated_at 
  BEFORE UPDATE ON debate_rooms 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 