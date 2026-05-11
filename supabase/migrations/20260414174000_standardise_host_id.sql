DO $$ 
BEGIN
  -- For hotels
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='hotels' AND column_name='host_id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='hotels' AND column_name='user_id') THEN
      ALTER TABLE public.hotels RENAME COLUMN user_id TO host_id;
    ELSE
      ALTER TABLE public.hotels ADD COLUMN host_id uuid;
    END IF;
  END IF;
  
  -- For resorts
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='resorts' AND column_name='host_id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='resorts' AND column_name='user_id') THEN
      ALTER TABLE public.resorts RENAME COLUMN user_id TO host_id;
    ELSE
      ALTER TABLE public.resorts ADD COLUMN host_id uuid;
    END IF;
  END IF;

  -- Drop existing complex policies
  EXECUTE 'DROP POLICY IF EXISTS "Anyone can view available hotels" ON public.hotels';
  EXECUTE 'DROP POLICY IF EXISTS "Hosts and admins can insert hotels" ON public.hotels';
  EXECUTE 'DROP POLICY IF EXISTS "Hosts and admins can update hotels" ON public.hotels';
  EXECUTE 'DROP POLICY IF EXISTS "Hosts and admins can delete hotels" ON public.hotels';

  -- Recreate clean policies for hotels
  EXECUTE 'CREATE POLICY "Anyone can view available hotels" ON public.hotels FOR SELECT USING (marketplace_visible = true OR host_id = auth.uid() OR public.has_role(auth.uid(), ''admin''))';
  EXECUTE 'CREATE POLICY "Hosts and admins can insert hotels" ON public.hotels FOR INSERT WITH CHECK (auth.uid() = host_id OR public.has_role(auth.uid(), ''admin''))';
  EXECUTE 'CREATE POLICY "Hosts and admins can update hotels" ON public.hotels FOR UPDATE USING (auth.uid() = host_id OR public.has_role(auth.uid(), ''admin''))';
  EXECUTE 'CREATE POLICY "Hosts and admins can delete hotels" ON public.hotels FOR DELETE USING (auth.uid() = host_id OR public.has_role(auth.uid(), ''admin''))';

  -- Drop existing complex policies for resorts
  EXECUTE 'DROP POLICY IF EXISTS "Anyone can view available resorts" ON public.resorts';
  EXECUTE 'DROP POLICY IF EXISTS "Hosts and admins can insert resorts" ON public.resorts';
  EXECUTE 'DROP POLICY IF EXISTS "Hosts and admins can update resorts" ON public.resorts';
  EXECUTE 'DROP POLICY IF EXISTS "Hosts and admins can delete resorts" ON public.resorts';

  -- Recreate clean policies for resorts
  EXECUTE 'CREATE POLICY "Anyone can view available resorts" ON public.resorts FOR SELECT USING (marketplace_visible = true OR host_id = auth.uid() OR public.has_role(auth.uid(), ''admin''))';
  EXECUTE 'CREATE POLICY "Hosts and admins can insert resorts" ON public.resorts FOR INSERT WITH CHECK (auth.uid() = host_id OR public.has_role(auth.uid(), ''admin''))';
  EXECUTE 'CREATE POLICY "Hosts and admins can update resorts" ON public.resorts FOR UPDATE USING (auth.uid() = host_id OR public.has_role(auth.uid(), ''admin''))';
  EXECUTE 'CREATE POLICY "Hosts and admins can delete resorts" ON public.resorts FOR DELETE USING (auth.uid() = host_id OR public.has_role(auth.uid(), ''admin''))';

END $$;
