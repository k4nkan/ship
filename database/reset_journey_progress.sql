update public.journey_state
set
  progress = 0,
  speed = round(20 + total_gyan * 0.2),
  updated_at = now()
where id = 1;
