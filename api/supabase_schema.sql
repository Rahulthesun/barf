-- Create the extractions table in Supabase
CREATE TABLE IF NOT EXISTS public.extractions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_name TEXT NOT NULL,
  product_url TEXT NOT NULL,
  features JSONB DEFAULT '[]'::jsonb,
  pricing_tiers JSONB DEFAULT '[]'::jsonb,
  resource_estimates JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.extractions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read extractions (for public previews if needed)
CREATE POLICY "Allow public read access on extractions" 
  ON public.extractions 
  FOR SELECT 
  USING (true);

-- Create policy to allow service role to insert/update extractions
-- (Service role bypasses RLS by default, but good practice to have policies if using Anon Key)
CREATE POLICY "Allow public insert on extractions" 
  ON public.extractions 
  FOR INSERT 
  WITH CHECK (true);
