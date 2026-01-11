-- Add moves column to game_scores table for move-based ranking
ALTER TABLE public.game_scores 
ADD COLUMN IF NOT EXISTS moves integer DEFAULT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN public.game_scores.moves IS 'Number of moves/attempts made in the game (lower is better)';