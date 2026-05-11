-- ============================================================
-- LEGAL CHATBOT - COMPLETE SUPABASE DATABASE SETUP
-- Run this entire script in: Supabase → SQL Editor → New Query
-- ============================================================


-- ============================================================
-- SECTION 1: ENABLE REQUIRED EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- For uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";        -- For general crypto functions


-- ============================================================
-- SECTION 2: CREATE TABLES
-- ============================================================

-- ----------------------------
-- TABLE: profiles
-- Extends Supabase auth.users with application-level user data.
-- One profile per auth user (1:1 relationship).
-- ----------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       VARCHAR(255),
  full_name   VARCHAR(255),
  avatar_url  VARCHAR(500),
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.profiles IS 'Stores extended profile info for each authenticated user.';


-- ----------------------------
-- TABLE: chats
-- Each row represents one conversation session for a user.
-- ----------------------------
CREATE TABLE IF NOT EXISTS public.chats (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL DEFAULT 'New Chat',
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.chats IS 'Stores individual chat sessions per user.';


-- ----------------------------
-- TABLE: messages
-- Stores all messages (user queries + AI responses) inside a chat.
-- ----------------------------
CREATE TABLE IF NOT EXISTS public.messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id     UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  role        VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT NOT NULL,
  audio_url   VARCHAR(500),   -- Supabase Storage URL for Whisper audio input
  image_url   VARCHAR(500),   -- Supabase Storage URL for OCR image input
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.messages IS 'Stores individual messages within a chat session.';


-- ----------------------------
-- TABLE: user_documents
-- Stores metadata for documents uploaded by users (PDFs, images).
-- Actual file is stored in Supabase Storage; vectors in ChromaDB.
-- ----------------------------
CREATE TABLE IF NOT EXISTS public.user_documents (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_name      VARCHAR(255) NOT NULL,
  file_url       VARCHAR(500) NOT NULL,
  document_type  VARCHAR(50) NOT NULL CHECK (document_type IN ('pdf', 'image', 'text')),
  file_size      BIGINT,                  -- size in bytes
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.user_documents IS 'Stores metadata for user-uploaded legal documents.';


-- ============================================================
-- SECTION 3: INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_chats_user_id       ON public.chats(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id    ON public.messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_user_docs_user_id   ON public.user_documents(user_id);


-- ============================================================
-- SECTION 4: AUTO-UPDATE updated_at TIMESTAMP
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Attach to profiles
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Attach to chats
DROP TRIGGER IF EXISTS trg_chats_updated_at ON public.chats;
CREATE TRIGGER trg_chats_updated_at
  BEFORE UPDATE ON public.chats
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- SECTION 5: AUTO-CREATE PROFILE ON NEW USER SIGNUP
-- Fires automatically when Supabase Auth creates a new user.
-- SECURITY DEFINER bypasses RLS so it always succeeds.
-- The EXCEPTION block ensures signup is NEVER blocked by this.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Never block auth user creation even if profile insert fails
    RAISE WARNING 'handle_new_user() failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Drop existing trigger if any and re-create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- SECTION 6: ROW LEVEL SECURITY (RLS)
-- Ensures users can only access their own data.
-- ============================================================

-- --- profiles ---
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles: select own"  ON public.profiles;
DROP POLICY IF EXISTS "profiles: update own"  ON public.profiles;

CREATE POLICY "profiles: select own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles: update own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- --- chats ---
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chats: all own" ON public.chats;

CREATE POLICY "chats: all own"
  ON public.chats FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- --- messages ---
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages: all in own chats" ON public.messages;

CREATE POLICY "messages: all in own chats"
  ON public.messages FOR ALL
  USING (
    chat_id IN (
      SELECT id FROM public.chats WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    chat_id IN (
      SELECT id FROM public.chats WHERE user_id = auth.uid()
    )
  );

-- --- user_documents ---
ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_documents: all own" ON public.user_documents;

CREATE POLICY "user_documents: all own"
  ON public.user_documents FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- SECTION 7: VERIFICATION QUERIES
-- After running, these should show your tables and trigger.
-- ============================================================

-- Show all created tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Confirm the auth trigger is active
SELECT trigger_name, event_manipulation, action_timing, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'auth'
  AND event_object_table = 'users';
