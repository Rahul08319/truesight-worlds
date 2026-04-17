CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL,
  player_name TEXT NOT NULL,
  player_avatar TEXT NOT NULL DEFAULT '👤',
  player_color TEXT NOT NULL DEFAULT 'red',
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_room_created ON public.chat_messages(room_id, created_at);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view chat messages"
ON public.chat_messages FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert chat messages"
ON public.chat_messages FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update chat messages"
ON public.chat_messages FOR UPDATE
USING (true);