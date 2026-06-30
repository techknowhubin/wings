-- Enable Realtime for wallets table so admin traveller list updates live
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
