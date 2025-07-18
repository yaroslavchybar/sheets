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

-- Trigger to automatically update the updated_at timestamp
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

-- RLS Policies
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view their own role
CREATE POLICY "Users can view their own role" ON user_roles
FOR SELECT USING (auth.uid() = user_id);

-- Policy for admins to manage roles
CREATE POLICY "Admins can manage all roles" ON user_roles
FOR ALL USING (
    EXISTS (
        SELECT 1 
        FROM user_roles ur 
        JOIN auth.users u ON ur.user_id = u.id 
        WHERE u.id = auth.uid() AND ur.role = 'admin'
    )
);

-- Trigger to automatically create a role entry for new users
CREATE OR REPLACE FUNCTION handle_new_user_role()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_roles (user_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created_role
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user_role();
