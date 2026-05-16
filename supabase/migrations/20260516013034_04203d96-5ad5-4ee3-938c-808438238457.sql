
-- Add onboarding tracking to profiles
ALTER TABLE public.profiles ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT false;

-- Add policy so users can update their own onboarding status
CREATE POLICY "Users update own onboarding status" ON public.profiles
FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
