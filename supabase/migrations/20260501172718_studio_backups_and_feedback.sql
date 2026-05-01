CREATE TABLE IF NOT EXISTS raw_manual_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_timestamp TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    landmarks JSONB NOT NULL,
    is_normalized BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS raw_signs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_timestamp TEXT UNIQUE NOT NULL,
    config_hand_dominant_id TEXT,
    config_hand_recessive_id TEXT,
    meanings JSONB NOT NULL,
    frames JSONB NOT NULL,
    is_normalized BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS raw_phrases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id TEXT UNIQUE NOT NULL,
    spanish_translation TEXT NOT NULL,
    lsv_gloss TEXT NOT NULL,
    description TEXT,
    signs_list JSONB NOT NULL,
    is_normalized BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS raw_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    difficulty_level INTEGER,
    items_list JSONB NOT NULL,
    is_normalized BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE raw_manual_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_signs ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_phrases ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for raw_manual_configs" ON raw_manual_configs FOR ALL USING (true);
CREATE POLICY "Allow all operations for raw_signs" ON raw_signs FOR ALL USING (true);
CREATE POLICY "Allow all operations for raw_phrases" ON raw_phrases FOR ALL USING (true);
CREATE POLICY "Allow all operations for raw_modules" ON raw_modules FOR ALL USING (true);