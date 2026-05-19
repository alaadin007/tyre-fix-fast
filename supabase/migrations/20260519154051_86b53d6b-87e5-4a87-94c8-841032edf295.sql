-- Null out any customer full_name that contains a greeting/filler word, so the
-- bot falls back to a clean "Welcome back 👋" instead of "Welcome back Hey 👋"
-- and so future intake will ask for the real name.
UPDATE public.customers
SET full_name = NULL
WHERE full_name IS NOT NULL
  AND (
    lower(full_name) ~ '\m(hey|hi|hello|hiya|yo|sup|help|urgent|please|pls|thanks|ok|okay|yes|no|yeah|yep|nope|sure|mate|sir|madam|customer|hii|hiii|heyy|heyyy|hola|hai|good|morning|evening|afternoon|night|tyre|tire|tyres|tires|wheel|flat|puncture|car|emergency|approve|approved|reject|rejected)\M'
    OR length(full_name) < 2
    OR full_name !~ '^[A-Za-z][A-Za-z .''\-]{1,38}$'
  );