// supabase.js
const {createClient} = supabase;
const supabaseUrl = "https://xijvpojgtsimiczniivr.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpanZwb2pndHNpbWljem5paXZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NTYzNzEsImV4cCI6MjA3NTAzMjM3MX0.I-3RxcweFCLV2O0i6vG0JEQducvBbQhtvF_GG7Nzsw8";
window.supabaseClient = createClient(supabaseUrl, supabaseKey);