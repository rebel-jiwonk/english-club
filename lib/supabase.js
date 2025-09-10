import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Challenge-specific functions
export async function signInAnonymously(email) {
  // For this simple challenge, we'll use anonymous auth with metadata
  const { data, error } = await supabase.auth.signInAnonymously({
    options: {
      data: { email }
    }
  });
  
  if (error) throw error;
  return data;
}

export async function createOrGetUser(email, name) {
  // First try to get existing user
  const { data: existingUser, error: fetchError } = await supabase
    .from('challenge_users')
    .select('*')
    .eq('email', email)
    .single();

  if (existingUser) {
    return existingUser;
  }

  // Create new user if doesn't exist
  const { data: newUser, error: createError } = await supabase
    .from('challenge_users')
    .insert([{ email, name }])
    .select()
    .single();

  if (createError) throw createError;
  return newUser;
}

export async function logStudyEntry(userId, date, studyText, photoFile = null) {
  let photoUrl = null;

  // Upload photo if provided
  if (photoFile) {
    const fileExt = photoFile.name.split('.').pop();
    const fileName = `${userId}/${date}-${Math.random()}.${fileExt}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('study-photos')
      .upload(fileName, photoFile);

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('study-photos')
      .getPublicUrl(fileName);
    
    photoUrl = publicUrl;
  }

  // Insert log entry
  const { data, error } = await supabase
    .from('challenge_logs')
    .insert([{
      user_id: userId,
      date,
      study_text: studyText,
      photo_url: photoUrl
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getUserLogs(userId) {
  const { data, error } = await supabase
    .from('challenge_logs')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getAllUsers() {
  const { data, error } = await supabase
    .from('challenge_users')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

export async function getRecentLogs(limit = 10) {
  const { data, error } = await supabase
    .from('challenge_logs')
    .select(`
      *,
      challenge_users (
        name,
        email
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function getUserStats(userId) {
  const logs = await getUserLogs(userId);
  
  // Calculate streak
  let streak = 0;
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  // Sort logs by date descending
  const sortedLogs = logs
    .map(log => log.date)
    .sort()
    .reverse();

  if (sortedLogs.length === 0) return { streak: 0, totalLogs: 0 };

  // Check if logged today, if not start from yesterday
  let checkDate = new Date();
  if (!sortedLogs.includes(todayStr)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Count consecutive days
  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0];
    if (sortedLogs.includes(dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return {
    streak,
    totalLogs: logs.length
  };
}