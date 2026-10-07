import type { ReactNode } from "react";
import "@mantine/core/styles.css";
import { ColorSchemeScript, MantineProvider, createTheme } from "@mantine/core";

const theme = createTheme({
  primaryColor: "green",
  // Los tokens de diseño detallados en DESIGN_SYSTEM.md se pueden extender aquí
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <MantineProvider theme={theme}>{children}</MantineProvider>
      </body>
    </html>
  );
}
