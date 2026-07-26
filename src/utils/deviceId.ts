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
  const deviceId = getDeviceId();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-client-device-id': deviceId,
  };

  if (storedKey) headers['x-gemini-api-key'] = storedKey;
  if (storedCode) headers['x-student-access-code'] = storedCode;

  return headers;
}

export async function unbindCurrentDevice() {
  const storedCode = localStorage.getItem('user_student_access_code') || '';
  const deviceId = getDeviceId();
  if (!storedCode) return;

  try {
    await fetch('/api/unbind', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-device-id': deviceId,
        'x-student-access-code': storedCode,
      },
      body: JSON.stringify({
        studentAccessCode: storedCode,
        deviceId,
      }),
    });
  } catch (err) {
    console.warn('Failed to unbind device:', err);
  }
}
