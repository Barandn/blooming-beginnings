-- ============================================
-- Add Lives System to barn_game_attempts
-- ============================================
-- Each player gets 5 lives that regenerate every 6 hours
-- Lives are consumed when a game is lost/failed

-- Add lives column (default 5 lives per user)
ALTER TABLE public.barn_game_attempts
ADD COLUMN lives INTEGER NOT NULL DEFAULT 5;

-- Add timestamp to track when lives were last regenerated
ALTER TABLE public.barn_game_attempts
ADD COLUMN lives_last_regenerated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- Add constraint to ensure lives are between 0 and 5
ALTER TABLE public.barn_game_attempts
ADD CONSTRAINT check_lives_range CHECK (lives >= 0 AND lives <= 5);

-- Create index for lives regeneration queries
CREATE INDEX idx_barn_game_attempts_lives_regen ON public.barn_game_attempts(lives_last_regenerated_at)
WHERE lives < 5;

-- Create function to regenerate lives (every 6 hours)
CREATE OR REPLACE FUNCTION public.regenerate_lives(p_user_id UUID)
RETURNS TABLE(lives_count INTEGER, next_life_at TIMESTAMP WITH TIME ZONE) AS $$
DECLARE
  v_current_lives INTEGER;
  v_last_regen TIMESTAMP WITH TIME ZONE;
  v_hours_passed NUMERIC;
  v_lives_to_add INTEGER;
  v_new_lives INTEGER;
  v_next_life_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get current lives and last regeneration time
  SELECT lives, lives_last_regenerated_at
  INTO v_current_lives, v_last_regen
  FROM public.barn_game_attempts
  WHERE user_id = p_user_id;

  -- If no record exists, return NULL
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- If already at max lives, no regeneration needed
  IF v_current_lives >= 5 THEN
    RETURN QUERY SELECT v_current_lives, NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;

  -- Calculate hours passed since last regeneration
  v_hours_passed := EXTRACT(EPOCH FROM (now() - v_last_regen)) / 3600;

  -- Calculate how many lives to add (1 life per 6 hours)
  v_lives_to_add := FLOOR(v_hours_passed / 6)::INTEGER;

  -- If no lives to add yet, calculate next life time
  IF v_lives_to_add = 0 THEN
    v_next_life_time := v_last_regen + INTERVAL '6 hours';
    RETURN QUERY SELECT v_current_lives, v_next_life_time;
    RETURN;
  END IF;

  -- Calculate new lives (cap at 5)
  v_new_lives := LEAST(v_current_lives + v_lives_to_add, 5);

  -- Update the lives and regeneration timestamp
  UPDATE public.barn_game_attempts
  SET
    lives = v_new_lives,
    lives_last_regenerated_at = v_last_regen + (INTERVAL '6 hours' * v_lives_to_add),
    updated_at = now()
  WHERE user_id = p_user_id;

  -- Calculate next life time if not at max
  IF v_new_lives < 5 THEN
    v_next_life_time := v_last_regen + (INTERVAL '6 hours' * (v_lives_to_add + 1));
  ELSE
    v_next_life_time := NULL;
  END IF;

  RETURN QUERY SELECT v_new_lives, v_next_life_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to consume a life when game is played
CREATE OR REPLACE FUNCTION public.consume_life(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_lives INTEGER;
BEGIN
  -- First try to regenerate lives
  PERFORM public.regenerate_lives(p_user_id);

  -- Get current lives after regeneration
  SELECT lives INTO v_current_lives
  FROM public.barn_game_attempts
  WHERE user_id = p_user_id;

  -- If no lives available, return false
  IF v_current_lives IS NULL OR v_current_lives <= 0 THEN
    RETURN false;
  END IF;

  -- Consume one life
  UPDATE public.barn_game_attempts
  SET
    lives = lives - 1,
    updated_at = now()
  WHERE user_id = p_user_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Comment on the new columns
COMMENT ON COLUMN public.barn_game_attempts.lives IS 'Number of lives remaining (0-5). One life is consumed per game attempt. Regenerates 1 life every 6 hours.';
COMMENT ON COLUMN public.barn_game_attempts.lives_last_regenerated_at IS 'Timestamp when lives were last regenerated. Used to calculate when next life will be available.';
