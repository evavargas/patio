import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { ThemeProvider } from "@patio/theme";
import { queryClient } from "./api/query-client";
import { AppRoutes } from "./app/router";
import { restoreSession } from "./auth/session";
import "./i18n";
import "./index.css";

void restoreSession();

const root = document.getElementById("root");
if (root === null) throw new Error("Falta #root");

createRoot(root).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
