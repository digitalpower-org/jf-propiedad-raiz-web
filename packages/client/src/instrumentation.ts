export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('============= [INSTRUMENTATION] Registering server instrumentation');
    await import('@/server/config/server-config');
    console.log('============= Registering server instrumentation : Done');
  }
}
