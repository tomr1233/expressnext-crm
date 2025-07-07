-- Database setup for Google Drive sync functionality
-- Run these commands in your Supabase SQL editor

-- Add new columns to resources table for Google Drive sync
ALTER TABLE resources ADD COLUMN IF NOT EXISTS google_drive_id TEXT;
ALTER TABLE resources ADD COLUMN IF NOT EXISTS google_modified_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE resources ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE resources ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'manual';
ALTER TABLE resources ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_resources_google_drive_id ON resources(google_drive_id);
CREATE INDEX IF NOT EXISTS idx_resources_sync_status ON resources(sync_status);
CREATE INDEX IF NOT EXISTS idx_resources_last_synced_at ON resources(last_synced_at);

-- Create google_tokens table to store OAuth tokens for server-side operations
CREATE TABLE IF NOT EXISTS google_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_type TEXT DEFAULT 'Bearer',
    expires_at TIMESTAMP WITH TIME ZONE,
    scope TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create sync_logs table for tracking sync operations (optional)
CREATE TABLE IF NOT EXISTS sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID REFERENCES resources(id),
    action TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'error'
    status TEXT NOT NULL, -- 'success', 'error'
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies for google_tokens table
ALTER TABLE google_tokens ENABLE ROW LEVEL SECURITY;

-- Policy to allow service role to access tokens (for cron jobs)
CREATE POLICY "Allow service role access to tokens" ON google_tokens
    FOR ALL USING (auth.role() = 'service_role');

-- Policy to allow authenticated users to manage their tokens
CREATE POLICY "Allow users to manage their tokens" ON google_tokens
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Add RLS policies for sync_logs table
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- Policy to allow service role to access sync logs
CREATE POLICY "Allow service role access to sync logs" ON sync_logs
    FOR ALL USING (auth.role() = 'service_role');

-- Policy to allow authenticated users to view sync logs
CREATE POLICY "Allow users to view sync logs" ON sync_logs
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to update updated_at on google_tokens
CREATE TRIGGER update_google_tokens_updated_at
    BEFORE UPDATE ON google_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add constraint to ensure only one active token set
CREATE UNIQUE INDEX IF NOT EXISTS idx_google_tokens_active ON google_tokens(is_active) WHERE is_active = true;

COMMENT ON TABLE google_tokens IS 'Stores Google OAuth tokens for server-side operations like cron jobs';
COMMENT ON TABLE sync_logs IS 'Tracks Google Drive sync operations and their status';
COMMENT ON COLUMN resources.google_drive_id IS 'Google Drive file ID for synced files';
COMMENT ON COLUMN resources.google_modified_time IS 'Last modified time from Google Drive';
COMMENT ON COLUMN resources.last_synced_at IS 'When this file was last synced from Google Drive';
COMMENT ON COLUMN resources.sync_status IS 'Sync status: manual, synced, pending, deleted, error';
COMMENT ON COLUMN resources.version IS 'Version number, incremented on each sync';