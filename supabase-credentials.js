// ==============================================================================
// CONFIGURAÇÃO DAS CREDENCIAIS DO SUPABASE
// ==============================================================================
const SUPABASE_URL = "https://nvlupbqzimbgggvefaua.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_yNQPALy5JV1TsZowWPmlyQ_ooKZ4DA1";

// Inicializa cliente global do Supabase caso a biblioteca já esteja carregada
if (typeof window !== "undefined" && window.supabase && window.supabase.createClient) {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
