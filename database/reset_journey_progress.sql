update public.journey_state
set
  progress = 0,
  speed = round(8 + total_gyan * 0.001),
  updated_at = now()
where id = 1;
