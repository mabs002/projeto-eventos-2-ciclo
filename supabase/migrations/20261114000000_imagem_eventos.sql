-- =============================================================================
-- Migration: Suporte a fotos temáticas e capas nos Eventos
-- Executar no Supabase: SQL Editor → Colar tudo → Run.
-- =============================================================================

-- 1. Adiciona coluna imagem_url na tabela eventos (caso ainda não exista)
ALTER TABLE public.eventos ADD COLUMN IF NOT EXISTS imagem_url TEXT;

-- 2. Atualiza eventos padrão com fotos gastronômicas temáticas de alta resolução
UPDATE public.eventos
   SET imagem_url = 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1200&q=80'
 WHERE slug = 'oficina-massas-frescas-molhos-italianos'
   AND (imagem_url IS NULL OR imagem_url = '');

UPDATE public.eventos
   SET imagem_url = 'https://images.unsplash.com/photo-1569864321618-62287f3b50c4?auto=format&fit=crop&w=1200&q=80'
 WHERE slug = 'masterclass-confeitaria-francesa-macarons-eclairs'
   AND (imagem_url IS NULL OR imagem_url = '');

UPDATE public.eventos
   SET imagem_url = 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80'
 WHERE slug = 'workshop-paes-rusticos-fermentacao-natural'
   AND (imagem_url IS NULL OR imagem_url = '');

UPDATE public.eventos
   SET imagem_url = 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=80'
 WHERE slug = 'degustacao-guiada-vinhos-america-do-sul-queijos'
   AND (imagem_url IS NULL OR imagem_url = '');

UPDATE public.eventos
   SET imagem_url = 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1200&q=80'
 WHERE slug = 'tecnicas-sushi-tradicional-shari-corte-salmao'
   AND (imagem_url IS NULL OR imagem_url = '');
