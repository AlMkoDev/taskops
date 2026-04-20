import { NextRequest } from 'next/server';

export type RequestActor = {
  name: string;
  source: 'header' | 'fallback';
};

export function resolveRequestActor(request: NextRequest, fallbackName: string): RequestActor {
  const headerName = request.headers.get('x-actor-name')?.trim();
  if (headerName) {
    return {
      name: headerName,
      source: 'header'
    };
  }

  return {
    name: fallbackName,
    source: 'fallback'
  };
}
