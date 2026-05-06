import { Routes, Route } from "react-router";
import { AppShell } from "./components/AppShell";
import { RequireAuth } from "./components/RequireAuth";
import { ExplorePage } from "./routes/ExplorePage";
import { HomePage } from "./routes/HomePage";
import { LoginPage } from "./routes/LoginPage";
import { MyWatchbagsPage } from "./routes/MyWatchbagsPage";
import { SearchPage } from "./routes/SearchPage";
import { SettingsPage } from "./routes/SettingsPage";
import { SignUpPage } from "./routes/SignUpPage";
import { TitleDetailPage } from "./routes/TitleDetailPage";
import { WatchbagBoardPage } from "./routes/WatchbagBoardPage";
import { WatchbagDetailPage } from "./routes/WatchbagDetailPage";

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/title/:mediaType/:tmdbId" element={<TitleDetailPage />} />
        <Route path="/watchbag/:id" element={<WatchbagDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route
          path="/mywatchbags"
          element={
            <RequireAuth>
              <MyWatchbagsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/mywatchbags/:id"
          element={
            <RequireAuth>
              <WatchbagBoardPage />
            </RequireAuth>
          }
        />
        <Route
          path="/settings"
          element={
            <RequireAuth>
              <SettingsPage />
            </RequireAuth>
          }
        />
      </Route>
    </Routes>
  );
}
