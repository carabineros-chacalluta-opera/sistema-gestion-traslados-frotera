// ═══════════════════════════════════════════════════════════════
// SIGDOF · Módulo de Autenticación v2.0
// ═══════════════════════════════════════════════════════════════

const Auth = {
  usuario: null,

  async init() {
    const { data: { session } } = await sb.auth.getSession();
    if (session?.user) {
      this.usuario = session.user;
      this.mostrarApp();
    } else {
      this.mostrarLogin();
    }

    sb.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        this.usuario = session.user;
        this.mostrarApp();
      } else if (event === 'SIGNED_OUT') {
        this.usuario = null;
        this.mostrarLogin();
      }
    });
  },

  async login(email, password) {
    const btn = document.getElementById('login-btn');
    const errEl = document.getElementById('login-error');
    btn.disabled = true;
    btn.textContent = 'Verificando...';
    errEl.textContent = '';

    const { error } = await sb.auth.signInWithPassword({ email, password });

    btn.disabled = false;
    btn.textContent = 'INGRESAR AL SISTEMA';

    if (error) {
      errEl.textContent = error.message.includes('Invalid')
        ? 'Credenciales incorrectas. Verifique usuario y contraseña.'
        : error.message;
    }
  },

  async logout() {
    await sb.auth.signOut();
  },

  mostrarApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-wrapper').style.display = 'flex';
    const emailEl = document.getElementById('usuario-email');
    if (emailEl) emailEl.textContent = this.usuario?.email || '';
    // Iniciar la app
    window.appInit();
  },

  mostrarLogin() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app-wrapper').style.display = 'none';
  }
};
