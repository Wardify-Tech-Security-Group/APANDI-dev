/** Cliente HTTP, persistencia local y notificaciones SOS. */
window.ApandiAPIClient = class ApandiAPIClient {
  constructor() {
    this.token = localStorage.getItem('apandi_token') || null;
    try {
      this.user = JSON.parse(localStorage.getItem('apandi_user') || 'null');
    } catch (e) {
      this.user = null;
    }
    this.dbMode = 'MARIADB_LIVE';
    this.sosChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('apandi_sos_channel') : null;
  }

  getLocalStore(key, fallback) {
    try {
      const raw = localStorage.getItem('apandi_store_' + key);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      // ignore
    }
    return JSON.parse(JSON.stringify(fallback));
  }

  setLocalStore(key, val) {
    try {
      localStorage.setItem('apandi_store_' + key, JSON.stringify(val));
    } catch (e) {
      // ignore
    }
  }

  onSosAlert(callback) {
    if (this.sosChannel) {
      this.sosChannel.onmessage = function (event) {
        if (event.data && event.data.type === 'SOS_ALERT') {
          callback(event.data.payload);
        }
      };
    }
  }

  broadcastSosAlert(alertaPayload) {
    if (this.sosChannel) {
      this.sosChannel.postMessage({ type: 'SOS_ALERT', payload: alertaPayload });
    }
  }

  async request(route, options = {}) {
    const method = options.method || 'GET';
    const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    if (this.token) {
      headers.Authorization = 'Bearer ' + this.token;
    }

    try {
      const response = await fetch('/api/index.php?route=' + encodeURIComponent(route), {
        method: method,
        headers: headers,
        body: options.body ? JSON.stringify(options.body) : undefined
      });

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json();
        this.dbMode = 'MARIADB_LIVE';
        if (!response.ok) {
          const apiErr = new Error(data.error || 'Error en la operación');
          apiErr.status = response.status;
          apiErr.data = data;
          throw apiErr;
        }
        return data;
      }
      throw new Error('Fallback JS Engine');
    } catch (err) {
      if (
        err.status === 429 ||
        err.message.includes('bloquead') ||
        err.message.includes('bloqueo') ||
        err.message.includes('intentos') ||
        err.message.includes('Restricción Legal') ||
        err.message.includes('PIN de Firma') ||
        err.message.includes('Modo Solo Lectura') ||
        err.message.includes('Credenciales inválidas') ||
        err.message.includes('Solo Dirección/UTP') ||
        err.message.includes('Acceso reservado') ||
        err.message.includes('contraseña temporal') ||
        err.message.includes('Sin permisos')
      ) {
        throw err;
      }
      this.dbMode = 'JS_ENGINE_LOCAL';
      return this.handleJsFallback(route, method, options.body || {});
    }
  }

  handleJsFallback(route, method, body) {
    return window.ApandiFallback.handleJsFallback.call(this, route, method, body);
  }
};
