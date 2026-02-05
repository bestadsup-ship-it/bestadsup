import jwt from 'jsonwebtoken';
import { Handler, HandlerEvent } from '@netlify/functions';

export interface AuthContext {
  accountId: string;
}

export function verifyToken(event: HandlerEvent): AuthContext {
  const authHeader = event.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized');
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { accountId: string };
    return { accountId: decoded.accountId };
  } catch (error) {
    throw new Error('Invalid token');
  }
}

export function withAuth(handler: (event: HandlerEvent, context: AuthContext) => Promise<any>): Handler {
  return async (event) => {
    try {
      const authContext = verifyToken(event);
      return await handler(event, authContext);
    } catch (error: any) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: error.message || 'Unauthorized' }),
      };
    }
  };
}
