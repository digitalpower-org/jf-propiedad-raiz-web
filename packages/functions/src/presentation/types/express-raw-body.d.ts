export {};

declare module 'http' {
  interface IncomingMessage {
    /**
     * Body crudo de la petición, capturado por `express.json({ verify })`
     * solo en la ruta del webhook de delivery de Resend.
     * Svix necesita los bytes originales para verificar la firma.
     */
    rawBody?: Buffer;
  }
}
