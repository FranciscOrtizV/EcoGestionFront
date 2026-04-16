/** URL base del API Nest (sin barra final). Ajusta puerto y path global si usas prefijo `/api`. */
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  mapDefaultCenter: { /** Centro por defecto de mapas (WGS84). Ej.: San Felipe, Chile. */
    lat: -32.7508,
    lng: -70.7253,
  },
};
