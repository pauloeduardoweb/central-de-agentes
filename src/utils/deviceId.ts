export function getDeviceId(): string {
  let deviceId = localStorage.getItem('gz_client_device_id');
  if (!deviceId) {
    deviceId = `dev-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('gz_client_device_id', deviceId);
  }
  return deviceId;
}

export function getAuthHeaders() {
  const storedKey = localStorage.getItem('user_gemini_api_key') || '';
  const storedCode = localStorage.getItem('user_student_access_code') || '';
  const storedSessionId = localStorage.getItem('user_session_id') || '';
  const deviceId = getDeviceId();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-client-device-id': deviceId,
  };

  if (storedKey) headers['x-gemini-api-key'] = storedKey;
  if (storedCode) headers['x-student-access-code'] = storedCode;
  if (storedSessionId) headers['x-session-id'] = storedSessionId;

  return headers;
}

export interface UnbindResult {
  success: boolean;
  status?: string;
  sessionReleased?: boolean;
  alreadyLoggedOut?: boolean;
  obsoleteSession?: boolean;
  error?: string;
  message?: string;
}

export async function unbindCurrentDevice(): Promise<UnbindResult> {
  const storedCode = localStorage.getItem('user_student_access_code') || '';
  const storedSessionId = localStorage.getItem('user_session_id') || '';
  const deviceId = getDeviceId();

  if (!storedCode && !storedSessionId) {
    return {
      success: true,
      status: 'unbound',
      sessionReleased: true,
      alreadyLoggedOut: true,
    };
  }

  try {
    const response = await fetch('/api/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-device-id': deviceId,
        'x-student-access-code': storedCode,
        'x-session-id': storedSessionId,
      },
      body: JSON.stringify({
        studentAccessCode: storedCode,
        accessCode: storedCode,
        sessionId: storedSessionId,
        deviceId,
      }),
    });

    let data: any = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok || data.success === false || data.error) {
      const errorType = data.error || 'LOGOUT_FAILED';
      const errorMessage = data.message || 'Não foi possível encerrar sua sessão no servidor. Tente novamente.';
      console.error('[Logout Error]:', { status: response.status, data });
      return {
        success: false,
        error: errorType,
        message: errorMessage,
      };
    }

    return {
      success: true,
      status: data.status || 'unbound',
      sessionReleased: Boolean(data.sessionReleased !== false),
      alreadyLoggedOut: Boolean(data.alreadyLoggedOut),
      obsoleteSession: Boolean(data.obsoleteSession || data.status === 'local_session_obsolete'),
      message: data.message,
    };
  } catch (err: any) {
    console.error('[Logout Network Error]:', err);
    return {
      success: false,
      error: 'NETWORK_ERROR',
      message: 'Não foi possível conectar ao servidor para encerrar a sessão. Verifique sua conexão e tente novamente.',
    };
  }
}
