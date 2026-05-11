import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router";

import { App } from "./App";
import { AppProviders } from "./providers";
import "./index.css";

// Warm the 3D chunk the moment the app starts. By the time HomePage mounts
// and the lazy() import resolves, the code is already in cache — so the
// backdrop and the hero copy reach the screen in the same frame instead of
// one popping in a beat after the other. Fire-and-forget is fine; on routes
// that never render the 3D it's still just one idle download.
void import("./components/three/PosterFieldBackdrop");
void import("./components/three/OrbitingRing");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProviders>
        <App />
      </AppProviders>
    </BrowserRouter>
  </React.StrictMode>,
);
