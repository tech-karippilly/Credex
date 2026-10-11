export interface JwtPayload {
  sub: string;
  email: string;
  authVersion?: number;
}
