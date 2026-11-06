import { getHealth } from "@/lib/ai/models";
import { route } from "@/lib/api";

export const maxDuration = 60;

export const GET = route(async () => getHealth());
