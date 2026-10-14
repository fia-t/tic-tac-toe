import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./fonts";
import { lifecycle } from "./sdk/lifecycle";

// Якомога раніше - до завантаження тем/картинок (вимога SDK порталу).
lifecycle.loadingStart();

const container = document.getElementById("root");
if (!container) throw new Error("#root not found");

createRoot(container).render(
    <StrictMode>
        <App />
    </StrictMode>
);
