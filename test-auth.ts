import { normalizeAccessCode } from './server/authKeys';

async function runTests() {
  console.log('=== INICIANDO BATERIA DE TESTES AUTOMÁTICOS DE AUTENTICAÇÃO UNIFICADA ===\n');

  const BASE_URL = process.env.TEST_TARGET_URL || 'http://localhost:3000';
  console.log(`Alvo do teste: ${BASE_URL}\n`);

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passedCount++;
    } else {
      console.error(`❌ [FAIL] ${testName} ${detail ? `-> ${detail}` : ''}`);
      failedCount++;
    }
  }

  try {
    // 0. Limpeza inicial de sessões para os testes
    await fetch(`${BASE_URL}/api/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessCode: 'GZ-5KRT-SRGB' }),
    });
    await fetch(`${BASE_URL}/api/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessCode: 'GZ-93P4-4MYL' }),
    });

    // 1. Teste da Rota de Diagnóstico GET /api/auth/status
    const resStatus = await fetch(`${BASE_URL}/api/auth/status`);
    const dataStatus = await resStatus.json();
    assert(
      resStatus.status === 200 &&
        dataStatus.backendOnline === true &&
        dataStatus.masterKeysLoaded === 4 &&
        dataStatus.studentKeysLoaded === 200 &&
        dataStatus.totalKeysLoaded === 204,
      'GET /api/auth/status retorna status 200 com exatamente 4 chaves mestras e 200 chaves de alunos (total 204)',
      `Status: ${resStatus.status}, Body: ${JSON.stringify(dataStatus)}`
    );

    // 2. Normalização de string (letras minúsculas, espaços, caracteres invisíveis)
    const rawWithSpacesAndInvisible = '  gz-5krt-srgb\u200B  ';
    const normalized = normalizeAccessCode(rawWithSpacesAndInvisible);
    assert(
      normalized === 'GZ-5KRT-SRGB',
      'Normalização remove espaços, caracteres invisíveis e transforma em maiúsculas',
      `Obtido: "${normalized}"`
    );

    // 3. Tentativa sem código de acesso deve retornar HTTP 400 ACCESS_CODE_REQUIRED
    const resEmpty = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessCode: '' }),
    });
    const dataEmpty = await resEmpty.json();
    assert(
      resEmpty.status === 400 && dataEmpty.error === 'ACCESS_CODE_REQUIRED',
      'Requisição sem código de acesso retorna HTTP 400 e ACCESS_CODE_REQUIRED',
      `Status: ${resEmpty.status}, Error: ${dataEmpty.error}`
    );

    // 4. Chave inexistente deve ser rejeitada com HTTP 401 e INVALID_ACCESS_CODE
    const resInvalid = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessCode: 'GZ-0000-0000' }),
    });
    const dataInvalid = await resInvalid.json();
    assert(
      resInvalid.status === 401 && dataInvalid.error === 'INVALID_ACCESS_CODE',
      'Chave inexistente é rejeitada com HTTP 401 e INVALID_ACCESS_CODE',
      `Status: ${resInvalid.status}, Error: ${dataInvalid.error}`
    );

    // 5. Chave de aluno válida é aceita via POST /api/auth/login (com minúsculas e espaços)
    const resStudentA = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessCode: ' gz-5krt-srgb ', deviceId: 'device-student-a' }),
    });
    const dataStudentA = await resStudentA.json();
    assert(
      resStudentA.status === 200 && dataStudentA.sessionId,
      'Chave de aluno válida com minúsculas e espaços é aceita no POST /api/auth/login com HTTP 200',
      `Status: ${resStudentA.status}, SessionId: ${dataStudentA.sessionId}`
    );
    const sessionA = dataStudentA.sessionId;

    // 6. Chave de aluno é bloqueada no segundo dispositivo enquanto a primeira estiver ativa (HTTP 409)
    const resStudentB = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessCode: 'GZ-5KRT-SRGB', deviceId: 'device-student-b' }),
    });
    const dataStudentB = await resStudentB.json();
    assert(
      resStudentB.status === 409 && dataStudentB.error === 'SESSION_ALREADY_ACTIVE',
      'Chave de aluno em segundo dispositivo é bloqueada com HTTP 409 e SESSION_ALREADY_ACTIVE',
      `Status: ${resStudentB.status}, Error: ${dataStudentB.error}`
    );

    // 7. Chaves Mestras (MENTOR-BIGODE, BIGODE-MENTOR, etc.) são validadas com sucesso em /api/auth/login
    const resMaster1 = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessCode: ' mentor-bigode ', deviceId: 'master-dev-1' }),
    });
    const dataMaster1 = await resMaster1.json();

    const resMaster2 = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessCode: 'BIGODE7144', deviceId: 'master-dev-2' }),
    });
    const dataMaster2 = await resMaster2.json();

    assert(
      resMaster1.status === 200 && resMaster2.status === 200 && dataMaster1.isMaster === true && dataMaster2.isMaster === true,
      'Chaves mestras (MENTOR-BIGODE) são validadas com sucesso com HTTP 200 e isMaster: true',
      `Master1: status=${resMaster1.status} isMaster=${dataMaster1.isMaster}, Master2: status=${resMaster2.status} isMaster=${dataMaster2.isMaster}`
    );

    // 8. Após logout, a chave de aluno é liberada para novo login
    const resLogout = await fetch(`${BASE_URL}/api/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessCode: 'GZ-5KRT-SRGB', sessionId: sessionA }),
    });
    assert(resLogout.status === 200, 'Logout executado com sucesso', `Status: ${resLogout.status}`);

    const resStudentRelogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessCode: 'GZ-5KRT-SRGB', deviceId: 'device-student-b' }),
    });
    const dataStudentRelogin = await resStudentRelogin.json();
    assert(
      resStudentRelogin.status === 200 && dataStudentRelogin.sessionId,
      'Após logout, a chave de aluno é liberada para novo login',
      `Status: ${resStudentRelogin.status}`
    );

    console.log(`\n==================================================`);
    console.log(`RESULTADO DOS TESTES: ${passedCount} Passaram, ${failedCount} Falharam.`);
    console.log(`==================================================\n`);

    if (failedCount > 0) {
      process.exit(1);
    }
  } catch (err: any) {
    console.error('Erro ao executar testes:', err);
    process.exit(1);
  }
}

runTests();
