-- Drop existing objects to ensure a clean slate
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user_role();
DROP TABLE IF EXISTS user_roles;
DROP TYPE IF EXISTS user_role CASCADE;

-- Create an enum for roles to ensure data integrity
CREATE TYPE user_role AS ENUM ('member', 'admin', 'moderator', 'editor');

-- Create a user_roles table with comprehensive role management
CREATE TABLE user_roles (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    role user_role DEFAULT 'member' NOT NULL,
    created_at timestamp with time zone DEFAULT NOW(),
    updated_at timestamp with time zone DEFAULT NOW()
);

-- Comment to explain the purpose of the table
COMMENT ON TABLE user_roles IS 'Stores roles for each user, linking to the auth.users table.';

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

-- Trigger to update modification time
CREATE TRIGGER update_user_roles_modtime
BEFORE UPDATE ON user_roles
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Enable Row Level Security
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view their own role
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
CREATE POLICY "Users can view their own role" ON user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Policy for admins to manage all roles
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;
CREATE POLICY "Admins can manage all roles" ON user_roles
FOR ALL USING (
    EXISTS (
        SELECT 1 
        FROM user_roles ur 
        WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
);

-- This function runs with the privileges of the user who defined it,
-- which should be a superuser in the Supabase context.
-- The `SET search_path = public` is crucial to ensure the function
-- can find the `user_roles` table correctly.
CREATE OR REPLACE FUNCTION handle_new_user_role()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'member');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- Trigger to automatically create a role entry for new users
CREATE TRIGGER on_auth_user_created_role
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user_role();

-- Grant permissions for the RLS to work correctly with Supabase auth
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
GRANT ALL ON public.user_roles TO postgres;
