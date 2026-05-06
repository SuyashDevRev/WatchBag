import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@watchbag/server/src/routers";

export const trpc = createTRPCReact<AppRouter>();
