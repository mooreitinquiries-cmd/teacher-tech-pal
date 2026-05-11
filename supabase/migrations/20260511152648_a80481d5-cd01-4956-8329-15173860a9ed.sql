
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'teacher');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Auto-create profile + assign role on signup (first user = admin)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_count INT;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''), NEW.email);

  SELECT COUNT(*) INTO user_count FROM public.user_roles;
  IF user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'teacher');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Profiles RLS
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- user_roles RLS
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Manuals
CREATE TABLE public.manuals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  content TEXT,
  file_path TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.manuals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view manuals" ON public.manuals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage manuals" ON public.manuals FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Storage bucket for manual files
INSERT INTO storage.buckets (id, name, public) VALUES ('manuals', 'manuals', false);
CREATE POLICY "Auth users read manuals files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'manuals');
CREATE POLICY "Admins upload manuals files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'manuals' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update manuals files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'manuals' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete manuals files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'manuals' AND public.has_role(auth.uid(), 'admin'));

-- Vault
CREATE TABLE public.vault_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  username TEXT,
  password TEXT,
  url TEXT,
  notes TEXT,
  is_shared BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vault_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own private entries" ON public.vault_entries FOR SELECT
  USING (auth.uid() = user_id AND is_shared = false);
CREATE POLICY "View shared entries" ON public.vault_entries FOR SELECT TO authenticated
  USING (is_shared = true);
CREATE POLICY "Insert own private entries" ON public.vault_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_shared = false);
CREATE POLICY "Update own private entries" ON public.vault_entries FOR UPDATE
  USING (auth.uid() = user_id AND is_shared = false);
CREATE POLICY "Delete own private entries" ON public.vault_entries FOR DELETE
  USING (auth.uid() = user_id AND is_shared = false);
CREATE POLICY "Admins manage shared entries" ON public.vault_entries FOR ALL
  USING (is_shared = true AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (is_shared = true AND public.has_role(auth.uid(), 'admin'));

-- Chat
CREATE TABLE public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own conversations" ON public.chat_conversations FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own messages" ON public.chat_messages FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
