/**
 * Formato típico Nest (class-validator / @nestjs/jwt).
 * Si tu DTO usa camelCase, el AuthService normaliza ambos.
*/
export interface TokenPair {
  accessToken:  string;
  refreshToken: string;
}

export interface LoginRequestBody {
  email: string;
  password: string;
}

export interface RefreshRequestBody {
  refreshToken: string;
}
