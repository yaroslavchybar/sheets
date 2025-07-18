-- Drop the existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;

-- Drop the trigger function if it exists
DROP FUNCTION IF EXISTS handle_new_user_role();

-- Drop the user_roles table first if it exists
DROP TABLE IF EXISTS user_roles;

-- Drop the existing type if it exists
DROP TYPE IF EXISTS user_role CASCADE;

-- Create an enum for roles to ensure data integrity
CREATE TYPE user_role AS ENUM ('member', 'admin', 'moderator', 'editor');

-- Create a user_roles table with comprehensive role management
CREATE TABLE user_roles (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    role user_role DEFAULT 'member',
    created_at timestamp with time zone DEFAULT NOW(),
    updated_at timestamp with time zone DEFAULT NOW()
);

-- Create an index on user_id for faster lookups
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);

-- Trigger function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_roles_modtime
BEFORE UPDATE ON user_roles
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Enable Row Level Security
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- **POLICY FIX**
-- The policies are split to be more explicit and correct.
-- 1. Users can view their OWN role. This is essential for the app to function for any logged-in user.
CREATE POLICY "Users can view their own role" ON public.user_roles
FOR SELECT USING (auth.uid() = user_id);

-- 2. Admins can view and manage ALL OTHER user roles.
CREATE POLICY "Admins can manage all roles" ON public.user_roles
FOR ALL USING (
    EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Trigger function to automatically create a role entry for new users
CREATE OR REPLACE FUNCTION handle_new_user_role()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'member');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created_role
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user_role();

-- Grant usage on the public schema to necessary roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant insert permissions on the user_roles table
GRANT INSERT ON TABLE public.user_roles TO anon, authenticated;

-- Grant select and update permissions for specific columns
GRANT SELECT, UPDATE (role) ON TABLE public.user_roles TO authenticated;
