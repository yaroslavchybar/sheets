-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'member', 'editor', 'moderator'))
);

-- Seed an admin user
-- Replace with the actual user UUID from your Supabase auth dashboard
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = 'c1c5e6f3-1111-2222-3333-a3d8f1e5b1a3') THEN
    INSERT INTO public.user_roles (user_id, role) 
    VALUES ('c1c5e6f3-1111-2222-3333-a3d8f1e5b1a3', 'admin');
  END IF;
END $$;

-- Ensure postgres role can reference auth.users for foreign key constraints
GRANT REFERENCES ON auth.users TO postgres;

-- Alter user_roles table to ensure proper foreign key constraint
ALTER TABLE public.user_roles 
DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey,
ADD CONSTRAINT user_roles_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Safely create index if it doesn't already exist
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);


-- Enable Row Level Security on the table
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view and manage their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

-- Policy 1: Allows any authenticated user to see their own role.
CREATE POLICY "Users can view and manage their own roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (user_id = auth.uid());

-- Policy 2: Allows users with the 'admin' role to see and manage all roles.
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);
