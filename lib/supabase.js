import { createClient } from 'https://esm.run/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Create or fetch by email (case-insensitive). Updates name if changed.
export async function createOrGetUser(email, name) {
  const emailNorm = (email || '').trim().toLowerCase();
  if (!emailNorm) throw new Error('Email required');

  let { data: existing, error: selErr } = await supabase
    .from('challenge_users')
    .select('*')
    .ilike('email', emailNorm)
    .limit(1);
  if (selErr) throw selErr;

  if (existing && existing.length) {
    const row = existing[0];
    if (name && name !== row.name) {
      const { data: upd, error: updErr } = await supabase
        .from('challenge_users')
        .update({ name })
        .eq('id', row.id)
        .select()
        .single();
      if (updErr) throw updErr;
      return upd;
    }
    return row;
  }

  const { data: inserted, error: insErr } = await supabase
    .from('challenge_users')
    .insert({ email: emailNorm, name: name || emailNorm.split('@')[0] })
    .select()
    .single();
  if (insErr) throw insErr;
  return inserted;
}

export async function logStudyEntry(userId, date, studyText, photoFile = null) {
  let photo_url = null;

  if (photoFile) {
    try {
      const ext = (photoFile.name.split('.').pop() || 'bin').toLowerCase();
      const fileName = `${userId}/${date}-${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase
        .storage.from('study-photos')
        .upload(fileName, photoFile, { contentType: photoFile.type, upsert: false });
      if (!upErr) {
        const { data: { publicUrl } } = supabase.storage
          .from('study-photos')
          .getPublicUrl(fileName);
        photo_url = publicUrl;
      }
    } catch (e) {
      console.warn('Photo upload failed, continuing without photo:', e);
    }
  }

  const { data, error } = await supabase
    .from('challenge_logs')
    .insert({ user_id: userId, date, study_text: studyText, photo_url })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getUserLogs(userId) {
  const { data, error } = await supabase
    .from('challenge_logs')
    .select('id, date, study_text, photo_url')
    .eq('user_id', userId)
    .order('date', { ascending: true });
  if (error) throw error;
  return data;
}

export async function getAllUsers() {
  const { data, error } = await supabase
    .from('challenge_users')
    .select('id, name, email')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function getRecentLogs(limit = 10) {
  const { data, error } = await supabase
    .from('challenge_logs')
    .select('id, date, study_text, photo_url, user_id, challenge_users(name)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function getUserStats(userId) {
  const logs = await getUserLogs(userId);
  const totalLogs = logs.length;

  const dates = new Set(logs.map(l => l.date)); // 'YYYY-MM-DD'
  let streak = 0;
  let cursor = new Date();
  while (true) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, '0');
    const d = String(cursor.getDate()).padStart(2, '0');
    const key = `${y}-${m}-${d}`;
    if (dates.has(key)) { streak += 1; cursor.setDate(cursor.getDate() - 1); }
    else break;
  }
  return { streak, totalLogs };
}