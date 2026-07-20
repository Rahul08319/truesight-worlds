
CREATE OR REPLACE FUNCTION public.check_chat_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count int;
BEGIN
  SELECT count(*) INTO recent_count
  FROM public.chat_messages
  WHERE player_name = NEW.player_name
    AND room_id = NEW.room_id
    AND created_at > now() - interval '10 seconds';

  IF recent_count >= 10 THEN
    RAISE EXCEPTION 'Rate limit exceeded: max 10 chat messages per 10 seconds';
  END IF;

  IF length(NEW.text) > 500 THEN
    RAISE EXCEPTION 'Message too long: max 500 characters';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_rate_limit_trigger ON public.chat_messages;
CREATE TRIGGER chat_rate_limit_trigger
  BEFORE INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.check_chat_rate_limit();

CREATE OR REPLACE FUNCTION public.check_room_create_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count int;
BEGIN
  SELECT count(*) INTO recent_count
  FROM public.game_rooms
  WHERE host_player_id = NEW.host_player_id
    AND created_at > now() - interval '1 minute';

  IF recent_count >= 5 THEN
    RAISE EXCEPTION 'Rate limit exceeded: max 5 room creations per minute';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS room_create_rate_limit_trigger ON public.game_rooms;
CREATE TRIGGER room_create_rate_limit_trigger
  BEFORE INSERT ON public.game_rooms
  FOR EACH ROW EXECUTE FUNCTION public.check_room_create_rate_limit();
