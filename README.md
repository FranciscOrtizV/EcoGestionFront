# EcoGestion — Frontend

SPA de gestión de recolección con **Angular 19**, **Tailwind CSS 4**, **DaisyUI** y mapas **Leaflet**.

---

## Tabla de contenidos

- [Descripción general](#descripción-general)
- [Requisitos](#requisitos)
- [Versiones del stack](#versiones-del-stack)
- [Instalación](#instalación)
- [Variables de entorno](#variables-de-entorno)
- [Desarrollo local](#desarrollo-local)
- [Build y despliegue](#build-y-despliegue)
- [Pruebas](#pruebas)
- [Autenticación (cliente)](#autenticación-cliente)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Solución de problemas](#solución-de-problemas)
- [Comandos Angular CLI](#comandos-angular-cli)

---

## Descripción general

| Aspecto | Detalle |
|--------|---------|
| **Paquete** | `eco-gestion` |
| **Framework** | Angular 19.2 |
| **UI** | Tailwind CSS 4 + DaisyUI 5 |
| **Mapas** | Leaflet + `@bluehalo/ngx-leaflet` |
| **Notificaciones** | ngx-sonner |
| **Puerto dev** | `4200` (`ng serve`) |
| **Salida build** | `dist/eco-gestion/` |

Las peticiones HTTP salen hacia la URL configurada en `environment.apiUrl`. El token JWT se guarda en el navegador (`localStorage`).

**Rutas por rol:**

| Ruta | Rol |
|------|-----|
| `/auth` | Login (invitados) |
| `/admin` | Administrador |
| `/supervisor` | Supervisor |
| `/planificador` | Planificador |
| `/conductor` | Conductor |

---

## Requisitos

| Herramienta | Versión |
|-------------|---------|
| **Node.js** | `^18.19.1` · `^20.11.1` · `>=22.0.0` |
| **npm** | `>= 8.0.0` (recomendado 10+) |
| **Git** | Reciente |
| **Navegador** | Chrome, Edge o Firefox actualizado |

**Recomendado en VS Code:** extensión [Angular Language Service](https://marketplace.visualstudio.com/items?itemName=Angular.ng-template) (`angular.ng-template`).

---

## Versiones del stack

| Paquete | Versión |
|---------|---------|
| `@angular/*` | ^19.2.0 |
| `@angular/cli` | ^19.2.15 |
| `typescript` | ~5.7.2 |
| `rxjs` | ~7.8.0 |
| `zone.js` | ~0.15.0 |
| `tailwindcss` | ^4.2.2 |
| `daisyui` | ^5.5.19 |
| `leaflet` | ^1.9.4 |
| `@bluehalo/ngx-leaflet` | ^19.0.0 |
| `ngx-sonner` | ^3.1.0 |

TypeScript: `target` / `module` **ES2022**, compilación **strict**.

---

## Instalación

```bash
git clone <url-del-repositorio>
cd EcoGestion
npm install
```

Build reproducible (CI):

```bash
npm ci
```

---

## Variables de entorno

Archivo: `src/environments/environment.ts`

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  mapDefaultCenter: {
    lat: -32.7508,
    lng: -70.7253,
  },
};
```

| Propiedad | Descripción |
|-----------|-------------|
| `apiUrl` | URL base del API REST (**sin** `/` al final). Todas las llamadas HTTP del front la usan como prefijo. |
| `mapDefaultCenter` | Centro inicial de los mapas Leaflet (`lat`, `lng` en WGS84). |
| `production` | `false` en desarrollo; `true` en builds de producción. |

Para otro entorno (staging/producción), cambia `apiUrl` o crea `environment.prod.ts` y configura `fileReplacements` en `angular.json`.

---

## Desarrollo local

```bash
npm start
```

Equivalente a `ng serve`. Abre **http://localhost:4200/**.

La app recarga sola al guardar cambios en `src/`.

### Opciones de `ng serve`

```bash
ng serve --port 4300
ng serve --host 0.0.0.0
ng serve --configuration development
ng serve --configuration production
```

### Scripts disponibles

| Script | Comando |
|--------|---------|
| `npm start` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run watch` | Build en modo desarrollo con watch |
| `npm test` | Tests unitarios (Karma) |

---

## Build y despliegue

```bash
npm run build
```

| Configuración | Comando | Resultado |
|---------------|---------|-----------|
| Producción (default) | `ng build` | `dist/eco-gestion/` optimizado |
| Desarrollo | `ng build --configuration development` | Source maps, sin optimizar |

Publica el contenido de `dist/eco-gestion/` en cualquier hosting estático (Nginx, IIS, Netlify, S3 + CloudFront, etc.). Antes del build, ajusta `apiUrl` al endpoint del entorno destino.

---

## Pruebas

```bash
npm test
```

Ejecuta **Karma** + **Jasmine** (navegador Chrome).

Análisis estático: `sonar-project.properties` (`sonar.sources=src`).

---

## Autenticación (cliente)

Comportamiento implementado en el front:

| Detalle | Ubicación / valor |
|---------|-------------------|
| Access token | `localStorage` → `ecogestion_access_token` |
| Refresh token | `localStorage` → `ecogestion_refresh_token` |
| Interceptor | `src/app/core/http/auth.interceptor.ts` — añade `Authorization: Bearer` a peticiones bajo `apiUrl` |
| Refresh ante 401 | Reintenta la petición; si falla → logout y `/auth/login` |
| Login / refresh | `AuthService` con `HttpBackend` (no pasan por el interceptor) |

Servicios HTTP: `src/app/core/services/`.

Guards de rutas: `src/app/core/guards/`.

---

## Estructura del proyecto

```
EcoGestion/
├── src/
│   ├── app/
│   │   ├── core/           # servicios, guards, interceptors, modelos
│   │   ├── feature/        # pantallas por dominio (auth, rutas, conductor…)
│   │   ├── shared/         # componentes reutilizables, dashboard layout
│   │   ├── app.config.ts   # providers (router, http + interceptor)
│   │   └── app.routes.ts   # rutas raíz y lazy loading
│   ├── environments/       # apiUrl, mapDefaultCenter
│   ├── styles.css          # Tailwind, DaisyUI, Leaflet
│   └── index.html
├── public/                 # imágenes y assets estáticos
├── angular.json
├── package.json
├── tsconfig.json
└── .postcssrc.json         # PostCSS + Tailwind v4
```

**Convenciones:**

- Componentes **standalone**.
- Rutas por feature en `*.routes.ts` con `loadChildren` / `loadComponent`.
- Estilos: Tailwind en plantillas + DaisyUI (`data-theme` en `index.html`).

---

## Solución de problemas

| Síntoma | Qué revisar |
|---------|-------------|
| Error de versión de Node | `node -v` debe ser ≥ 18.19.1 (ideal 20 LTS o 22) |
| `ng: command not found` | Usar `npm start` o `npx ng serve` |
| Errores HTTP / login | `environment.apiUrl` correcto; pestaña **Network** en DevTools |
| Pantalla en blanco tras login | Respuesta de `/usuarios/getMe` y guards en consola |
| Mapas sin capa base | Conexión a internet (tiles de Leaflet son externos) |
| Estilos rotos tras `npm install` | Borrar `node_modules` y `.angular/cache`, luego `npm install` |

```bash
node -v
npm -v
npm install
npm start
```

---

## Comandos Angular CLI

Proyecto generado con [Angular CLI](https://github.com/angular/angular-cli) 19.2.x.

```bash
ng generate component nombre-componente
ng generate --help
```

Referencia: [Angular CLI](https://angular.dev/tools/cli).

---

## Checklist — desarrollador frontend

- [ ] Node.js 20 LTS o 22 instalado
- [ ] `git clone` + `npm install`
- [ ] `apiUrl` en `src/environments/environment.ts` apunta al API del entorno
- [ ] `npm start` → http://localhost:4200
- [ ] Login y flujos principales verificados en el navegador
