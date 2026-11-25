import { QueryClient } from '@tanstack/react-query';

// AC2.2.12: en el servidor cada petición necesita su propio cliente (uno compartido mezclaría
// datos entre visitantes); en el navegador se reutiliza uno solo para conservar la caché.
// Se comprueba `window` en cada llamada (no al cargar el módulo) para poder probar ambas ramas.

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}

let clienteDelNavegador: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (typeof window === 'undefined') return makeQueryClient();
  clienteDelNavegador ??= makeQueryClient();
  return clienteDelNavegador;
}
