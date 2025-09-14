import { createClient } from 'https://esm.run/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

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
      
      console.log('Uploading photo:', fileName, 'Type:', photoFile.type);
      
      const { data: uploadData, error: upErr } = await supabase
        .storage.from('study-photos')
        .upload(fileName, photoFile, { contentType: photoFile.type, upsert: false });
      
      if (upErr) {
        console.error('Photo upload error:', upErr);
        throw new Error(`Photo upload failed: ${upErr.message}`);
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('study-photos')
        .getPublicUrl(fileName);
      photo_url = publicUrl;
      console.log('Photo uploaded successfully:', publicUrl);
    } catch (e) {
      console.error('Photo upload failed:', e);
      throw new Error(`Photo upload failed: ${e.message}`);
    }
  }

  console.log('Inserting log entry:', { userId, date, studyText, photo_url });
  
  const { data, error } = await supabase
    .from('challenge_logs')
    .insert({ user_id: userId, date, study_text: studyText, photo_url })
    .select()
    .single();
    
  if (error) {
    console.error('Database insert error:', error);
    throw new Error(`Failed to save study entry: ${error.message}`);
  }
  
  console.log('Study entry saved successfully:', data);
  return data;
}

export async function getUserLogs(userId) {
  console.log('Fetching user logs for:', userId);
  const { data, error } = await supabase
    .from('challenge_logs')
    .select('id, date, study_text, photo_url')
    .eq('user_id', userId)
    .order('date', { ascending: true });
  if (error) {
    console.error('Error fetching user logs:', error);
    throw error;
  }
  console.log('User logs fetched:', data?.length || 0, 'entries');
  return data;
}

export async function getAllUsers() {
  console.log('Fetching all users');
  const { data, error } = await supabase
    .from('challenge_users')
    .select('id, name, email')
    .order('created_at', { ascending: true });
  if (error) {
    console.error('Error fetching all users:', error);
    throw error;
  }
  console.log('All users fetched:', data?.length || 0, 'users');
  return data;
}

export async function getRecentLogs(limit = 10) {
  console.log('Fetching recent logs, limit:', limit);
  const { data, error } = await supabase
    .from('challenge_logs')
    .select('id, date, study_text, photo_url, user_id, challenge_users(name)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('Error fetching recent logs:', error);
    throw error;
  }
  console.log('Recent logs fetched:', data?.length || 0, 'entries');
  return data;
}

export async function getUserStats(userId) {
  console.log('Calculating stats for user:', userId);
  const logs = await getUserLogs(userId);
  const totalLogs = logs.length;
  console.log('User logs:', logs);

  const dates = new Set(logs.map(l => l.date)); // 'YYYY-MM-DD'
  console.log('Unique dates:', Array.from(dates).sort());
  
  let streak = 0;
  let cursor = new Date();
  
  // Use UTC to avoid timezone issues
  const today = new Date();
  const utcToday = new Date(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  cursor = new Date(utcToday);
  
  console.log('Starting streak calculation from:', cursor.toISOString().split('T')[0]);
  
  while (true) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, '0');
    const d = String(cursor.getDate()).padStart(2, '0');
    const key = `${y}-${m}-${d}`;
    
    console.log(`Checking date: ${key}, has log: ${dates.has(key)}`);
    
    if (dates.has(key)) { 
      streak += 1; 
      cursor.setDate(cursor.getDate() - 1); 
    } else {
      break;
    }
  }
  
  console.log('Final streak:', streak);
  return { streak, totalLogs };
}

export async function uploadRecording(userId, date, recordingFile, title = null) {
  if (!recordingFile) throw new Error('Recording file required');

  try {
    const ext = (recordingFile.name.split('.').pop() || 'mp3').toLowerCase();
    const fileName = `${userId}/${date}-${crypto.randomUUID()}.${ext}`;
    
    const { error: upErr } = await supabase
      .storage.from('study-recordings')
      .upload(fileName, recordingFile, { 
        contentType: recordingFile.type, 
        upsert: false 
      });
    
    if (upErr) throw upErr;

    const { data: { publicUrl } } = supabase.storage
      .from('study-recordings')
      .getPublicUrl(fileName);

    const { data, error } = await supabase
      .from('challenge_recordings')
      .insert({ 
        user_id: userId, 
        date, 
        recording_url: publicUrl,
        title: title || null
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (e) {
    console.error('Recording upload failed:', e);
    throw e;
  }
}

export async function getUserRecordings(userId) {
  const { data, error } = await supabase
    .from('challenge_recordings')
    .select('id, date, recording_url, title, created_at')
    .eq('user_id', userId)
    .order('date', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function getAllRecordings() {
  const { data, error } = await supabase
    .from('challenge_recordings')
    .select('id, date, recording_url, title, created_at, user_id, challenge_users(name)')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}