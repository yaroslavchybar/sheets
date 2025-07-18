-- Grant the postgres user reference permissions to the auth.users table
-- This is required for the foreign key constraint to work
GRANT REFERENCES (id) ON auth.users TO postgres;

-- Drop the existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;

-- Drop the trigger function if it exists
DROP FUNCTION IF EXISTS public.handle_new_user_role();

-- Drop the user_roles table first if it exists
DROP TABLE IF EXISTS public.user_roles;

-- Drop the existing type if it exists
DROP TYPE IF EXISTS public.user_role CASCADE;

-- Create an enum for roles to ensure data integrity
CREATE TYPE public.user_role AS ENUM ('member', 'admin', 'moderator', 'editor');

-- Create a user_roles table with comprehensive role management
CREATE TABLE public.user_roles (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    role public.user_role DEFAULT 'member' NOT NULL,
    created_at timestamp with time zone DEFAULT NOW(),
    updated_at timestamp with time zone DEFAULT NOW()
);

-- Create an index on user_id for faster lookups
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);

-- Trigger function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_roles_modtime
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_modified_column();

-- Enable Row Level Security
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view their own role
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles
FOR SELECT USING (auth.uid() = user_id);

-- Policy for admins to manage roles
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles" ON public.user_roles
FOR ALL USING (
    EXISTS (
        SELECT 1 
        FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);


-- Trigger function to automatically create a role entry for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'member');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created_role
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- Grant usage on the public schema to necessary roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant insert permissions on the user_roles table
GRANT INSERT ON TABLE public.user_roles TO anon, authenticated;

-- Grant select and update permissions for specific columns
GRANT SELECT, UPDATE (role) ON TABLE public.user_roles TO authenticated;
