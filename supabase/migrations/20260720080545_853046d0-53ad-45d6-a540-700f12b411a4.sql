
REVOKE EXECUTE ON FUNCTION public.check_chat_rate_limit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_room_create_rate_limit() FROM PUBLIC, anon, authenticated;
