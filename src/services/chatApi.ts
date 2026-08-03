/**
 * Unified Chat API Client with standard headers, error handling, and Dev logging.
 */

interface ChatApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  studentCode?: string;
  sessionId?: string;
}

interface ChatApiResponse<T = any> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
  code?: string;
}

let defaultStudentCode = '';
let defaultSessionId = '';

export function setChatApiCredentials(code: string, session?: string) {
  if (code) defaultStudentCode = code;
  if (session) defaultSessionId = session;
}

export function getChatApiCredentials() {
  return {
    studentCode: defaultStudentCode,
    sessionId: defaultSessionId,
  };
}

export async function chatApiFetch<T = any>(
  endpoint: string,
  options: ChatApiOptions = {}
): Promise<ChatApiResponse<T>> {
  const method = options.method || 'GET';
  const studentCode = options.studentCode || defaultStudentCode;
  const sessionId = options.sessionId || defaultSessionId;

  const reqHeaders: Record<string, string> = {
    ...options.headers,
  };

  if (studentCode) {
    reqHeaders['x-access-code'] = studentCode;
  }
  if (sessionId) {
    reqHeaders['x-session-id'] = sessionId;
  }

  let reqBody: any = options.body;

  // If body is object and not FormData/Blob, stringify as JSON and set Content-Type
  if (reqBody && typeof reqBody === 'object' && !(reqBody instanceof FormData) && !(reqBody instanceof Blob)) {
    reqHeaders['Content-Type'] = 'application/json';
    reqBody = JSON.stringify(reqBody);
  }

  const maskedCode = studentCode ? `${studentCode.slice(0, 4)}***` : 'NONE';
  console.log(`[CHAT REQUEST] ${method} ${endpoint}`, {
    maskedCode,
    hasSession: Boolean(sessionId),
  });

  try {
    const res = await fetch(endpoint, {
      method,
      headers: reqHeaders,
      body: reqBody,
    });

    let data: any = null;
    const contentType = res.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      try {
        data = await res.json();
      } catch (jsonErr) {
        console.warn('[CHAT RESPONSE] JSON Parse Error:', jsonErr);
      }
    } else {
      const text = await res.text();
      data = { message: text };
    }

    if (!res.ok) {
      const errorMsg = data?.message || data?.error || `Erro HTTP ${res.status}`;
      const errorCode = data?.error || `HTTP_${res.status}`;

      console.warn(`[CHAT PERMISSION / ERROR] ${method} ${endpoint} Status: ${res.status}`, {
        status: res.status,
        code: errorCode,
        message: errorMsg,
        body: data,
        maskedCode,
      });

      return {
        ok: false,
        status: res.status,
        error: errorMsg,
        code: errorCode,
        data,
      };
    }

    console.log(`[CHAT RESPONSE OK] ${method} ${endpoint}`, res.status);
    return {
      ok: true,
      status: res.status,
      data,
    };
  } catch (err: any) {
    console.error(`[CHAT NETWORK ERROR] ${method} ${endpoint}`, err);
    return {
      ok: false,
      status: 0,
      error: err?.message || 'Falha de conexão com o servidor.',
      code: 'NETWORK_ERROR',
    };
  }
}
