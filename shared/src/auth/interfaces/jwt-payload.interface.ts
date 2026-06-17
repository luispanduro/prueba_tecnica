/**
 * Represents the decoded JWT payload structure.
 */
export interface JwtPayload {
  sub: string; // user_id
  username: string;
  roles: string[];
  iat?: number;
  exp?: number;
}

/**
 * Represents the authenticated user attached to the request.
 */
export interface AuthenticatedUser {
  user_id: string;
  username: string;
  roles: string[];
}
