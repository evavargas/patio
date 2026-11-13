// Unica puerta al almacenamiento. En web es localStorage; en Capacitor se cambia esta implementacion
// por el plugin Preferences (misma interfaz, ya asincrona).
export type KeyValueStorage = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
};

// Con el almacenamiento bloqueado el juego sigue: solo se pierde lo guardado.
export const webStorage: KeyValueStorage = {
  get: (key) => {
    try {
      return Promise.resolve(localStorage.getItem(key));
    } catch {
      return Promise.resolve(null);
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // sin almacenamiento
    }
    return Promise.resolve();
  },
  remove: (key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // sin almacenamiento
    }
    return Promise.resolve();
  },
};
