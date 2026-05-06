import { Outlet } from "react-router";
import { FlowHeader } from "./FlowHeader";
import { Footer } from "./Footer";
import { ScrollFade } from "./ScrollFade";

export function AppShell() {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <FlowHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <ScrollFade />
    </div>
  );
}
