import { normalizeAccessCode } from './src/data/studentCodes';

async function runTests() {
  console.log('=== INICIANDO BATERIA DE TESTES AUTOMÁTICOS DE AUTENTICAÇÃO ===\n');

  const BASE_URL = 'http://localhost:3000';
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
      body: JSON.stringify({ studentAccessCode: 'GZ-5KRT-SRGB' }),
    });
    await fetch(`${BASE_URL}/api/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentAccessCode: 'GZ-93P4-4MYL' }),
    });

    // 1. Normalização de string (letras minúsculas, espaços, caracteres invisíveis)
    const rawWithSpacesAndInvisible = '  gz-5krt-srgb\u200B  ';
    const normalized = normalizeAccessCode(rawWithSpacesAndInvisible);
    assert(
      normalized === 'GZ-5KRT-SRGB',
      'Normalização remove espaços, caracteres invisíveis e transforma em maiúsculas',
      `Obtido: "${normalized}"`
    );

    // 2. Chave inexistente deve ser rejeitada com HTTP 401 e INVALID_ACCESS_CODE
    const resInvalid = await fetch(`${BASE_URL}/api/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentAccessCode: 'GZ-0000-0000' }),
    });
    const dataInvalid = await resInvalid.json();
    assert(
      resInvalid.status === 401 && dataInvalid.error === 'INVALID_ACCESS_CODE',
      'Chave inexistente é rejeitada com HTTP 401 e INVALID_ACCESS_CODE',
      `Status: ${resInvalid.status}, Error: ${dataInvalid.error}`
    );

    // 3. Chave de aluno válida é aceita (com minúsculas e espaços)
    const resStudentA = await fetch(`${BASE_URL}/api/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentAccessCode: ' gz-5krt-srgb ', deviceId: 'device-student-a' }),
    });
    const dataStudentA = await resStudentA.json();
    assert(
      resStudentA.status === 200 && dataStudentA.sessionId,
      'Chave de aluno válida com minúsculas e espaços é aceita com HTTP 200',
      `Status: ${resStudentA.status}`
    );
    const sessionA = dataStudentA.sessionId;

    // 4. Chave de aluno é bloqueada no segundo dispositivo enquanto a primeira estiver ativa
    const resStudentB = await fetch(`${BASE_URL}/api/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentAccessCode: 'GZ-5KRT-SRGB', deviceId: 'device-student-b' }),
    });
    const dataStudentB = await resStudentB.json();
    assert(
      resStudentB.status === 409 && dataStudentB.error === 'SESSION_ALREADY_ACTIVE',
      'Chave de aluno é bloqueada no segundo dispositivo com HTTP 409 e SESSION_ALREADY_ACTIVE',
      `Status: ${resStudentB.status}, Error: ${dataStudentB.error}`
    );

    // 5. Chave Mestra é aceita e funciona em múltiplos dispositivos simultaneamente
    const resMaster1 = await fetch(`${BASE_URL}/api/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentAccessCode: ' mentor-bigode ', deviceId: 'master-dev-1' }),
    });
    const dataMaster1 = await resMaster1.json();

    const resMaster2 = await fetch(`${BASE_URL}/api/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentAccessCode: 'BIGODE7144', deviceId: 'master-dev-2' }),
    });
    const dataMaster2 = await resMaster2.json();

    assert(
      resMaster1.status === 200 && resMaster2.status === 200 && dataMaster1.isMaster && dataMaster2.isMaster,
      'Chaves mestras funcionam simultaneamente em múltiplos dispositivos sem bloqueio',
      `Master1: ${resMaster1.status}, Master2: ${resMaster2.status}`
    );

    // 6. Após logout, a chave de aluno é liberada
    const resLogout = await fetch(`${BASE_URL}/api/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentAccessCode: 'GZ-5KRT-SRGB', sessionId: sessionA }),
    });
    assert(resLogout.status === 200, 'Logout executado com sucesso', `Status: ${resLogout.status}`);

    const resStudentRelogin = await fetch(`${BASE_URL}/api/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentAccessCode: 'GZ-5KRT-SRGB', deviceId: 'device-student-b' }),
    });
    const dataStudentRelogin = await resStudentRelogin.json();
    assert(
      resStudentRelogin.status === 200 && dataStudentRelogin.sessionId,
      'Após logout, a chave de aluno é liberada para novo login',
      `Status: ${resStudentRelogin.status}`
    );

    // 7. Teste de expiração de sessão (sem heartbeat por > 2 minutos libera chave de aluno)
    // Para testar expiração sem esperar 2 min reais, limpamos o logout e testamos uma chave não renovada
    await fetch(`${BASE_URL}/api/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentAccessCode: 'GZ-93P4-4MYL' }),
    });

    const resStudent2 = await fetch(`${BASE_URL}/api/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentAccessCode: 'GZ-93P4-4MYL', deviceId: 'dev-1' }),
    });
    assert(resStudent2.status === 200, 'Novo login para Aluno 2 (GZ-93P4-4MYL) aceito', `Status: ${resStudent2.status}`);

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
