-- Create a table for public user roles
CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    role text CHECK (role IN ('admin', 'member', 'editor', 'moderator')) NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Comments for clarity
COMMENT ON TABLE public.user_roles IS 'Stores the role for each user.';

-- Ensure postgres role (used by migrations) can reference auth.users table
-- This is crucial for the foreign key constraint to work properly.
DO $$
BEGIN
    BEGIN
        GRANT REFERENCES ON TABLE auth.users TO postgres;
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'REFERENCES permission on auth.users already granted to postgres.';
    END;
END $$;

-- Drop existing foreign key to re-create it correctly, ensuring it references auth.users
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create an index for faster lookups on user_id
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- Enable Row Level Security on the table
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Remove all previous policies to start fresh
DROP POLICY IF EXISTS "Users can manage their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Select own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Insert own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Update own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Delete own roles" ON public.user_roles;


-- DEFINITIVE RLS POLICIES

-- Policy 1: Allow any authenticated user to view their OWN role.
-- This is required for the application to check the user's permissions for the UI.
CREATE POLICY "Users can view their own role" ON public.user_roles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

-- Policy 2: Allow admins to view, add, update, and delete ANY user's role.
-- This is the key policy that grants admins full control on the User Management page.
CREATE POLICY "Admins can manage all roles" ON public.user_roles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Function to automatically create a user_roles entry for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'member'); -- Default role is 'member'
  RETURN new;
END;
$$;

-- Trigger to execute the function after a new user signs up in Supabase Auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed the admin user if it exists in auth.users but not in user_roles
-- Replace with your actual admin email
DO $$
DECLARE
    admin_user_id uuid;
BEGIN
    SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@sheetflow.app';
    IF admin_user_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (admin_user_id, 'admin')
        ON CONFLICT (user_id) 
        DO UPDATE SET role = 'admin';
    END IF;
END $$;
