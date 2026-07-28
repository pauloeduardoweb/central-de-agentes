export interface StudentProfileResponse {
  profileCreated: boolean;
  username?: string;
  avatar?: string | null;
  createdAt?: string;
  updatedAt?: string;
  isMaster?: boolean;
}

export interface UsernameCheckResponse {
  available: boolean;
  reason?: string;
  message?: string;
}

export class StudentProfileService {
  private static getHeaders(): Record<string, string> {
    const studentCode = typeof window !== 'undefined'
      ? localStorage.getItem('user_student_access_code') || ''
      : '';
    const sessionId = typeof window !== 'undefined'
      ? localStorage.getItem('user_session_id') || ''
      : '';

    return {
      'Content-Type': 'application/json',
      'x-access-code': studentCode,
      'x-student-access-code': studentCode,
      'x-session-id': sessionId,
    };
  }

  public static async getProfile(): Promise<StudentProfileResponse> {
    try {
      const res = await fetch('/api/student/profile', {
        headers: this.getHeaders(),
      });

      if (!res.ok) {
        if (res.status === 403) {
          return { profileCreated: true, isMaster: true };
        }
        return { profileCreated: false };
      }

      const data = await res.json();
      return data;
    } catch (err) {
      console.warn('StudentProfileService: Error fetching student profile', err);
      return { profileCreated: false };
    }
  }

  public static async checkUsername(username: string): Promise<UsernameCheckResponse> {
    try {
      const query = encodeURIComponent(username);
      const res = await fetch(`/api/student/profile/check-username?username=${query}`, {
        headers: this.getHeaders(),
      });

      const data = await res.json();
      return data;
    } catch (err) {
      console.warn('StudentProfileService: Error checking username', err);
      return { available: false, reason: 'Erro de conexão ao verificar nome.' };
    }
  }

  public static async createProfile(username: string, avatar?: string | null): Promise<{ success: boolean; avatar?: string | null; message?: string }> {
    try {
      const res = await fetch('/api/student/profile', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ username, avatar }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.message || 'Não foi possível criar o perfil.' };
      }

      return { success: true, avatar: data.avatar || null, message: data.message };
    } catch (err) {
      console.warn('StudentProfileService: Error creating profile', err);
      return { success: false, message: 'Erro de conexão ao criar perfil.' };
    }
  }

  public static async updateUsername(username: string, avatar?: string | null): Promise<{ success: boolean; avatar?: string | null; message?: string }> {
    try {
      const res = await fetch('/api/student/profile/username', {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify({ username, avatar }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.message || 'Não foi possível atualizar o perfil.' };
      }

      return { success: true, avatar: data.avatar || null, message: data.message };
    } catch (err) {
      console.warn('StudentProfileService: Error updating username', err);
      return { success: false, message: 'Erro de conexão ao atualizar perfil.' };
    }
  }

  public static async updateAvatar(avatar: string | null): Promise<{ success: boolean; avatar?: string | null; message?: string }> {
    try {
      const res = await fetch('/api/student/profile/avatar', {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify({ avatar }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.message || 'Não foi possível atualizar a foto.' };
      }

      return { success: true, avatar: data.avatar || null, message: data.message };
    } catch (err) {
      console.warn('StudentProfileService: Error updating avatar', err);
      return { success: false, message: 'Erro de conexão ao atualizar foto.' };
    }
  }
}
