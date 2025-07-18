-- Drop existing tables and functions if they exist to ensure a clean slate.
DROP TABLE IF EXISTS public.daily_assignments CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.app_settings CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- User Roles Table
-- Added daily_assignments_limit to store per-user task counts.
CREATE TABLE public.user_roles (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    role user_role DEFAULT 'member',
    daily_assignments_limit INTEGER DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily Task Assignments Table
CREATE TABLE public.daily_assignments (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    instagram_id TEXT NOT NULL,
    assignment_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, instagram_id, assignment_date)
);

-- Trigger function to add a new user to the user_roles table on signup.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'member');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute the function after a new user is created in auth.users.
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
