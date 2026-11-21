import { supabase } from "./supabase";

// Salvataggio unico: inserisce se manca l'id, altrimenti aggiorna (senza rimandare l'id)
export async function salva(tabella, riga) {
  const { id, ...resto } = riga;
  const q = id ? supabase.from(tabella).update(resto).eq("id", id) : supabase.from(tabella).insert(resto);
  const { data, error } = await q.select("*").single();
  if (error) { alert("Non salvato: " + error.message); throw error; }
  return data;
}
export async function elimina(tabella, id) {
  const { error } = await supabase.from(tabella).delete().eq("id", id);
  if (error) { alert("Non eliminato: " + error.message); throw error; }
}

