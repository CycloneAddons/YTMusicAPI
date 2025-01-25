import { z } from "zod";

// Define the Song type
export const Song = z.object({
    type: z.literal("SONG"),
    videoId: z.string(),
    title: z.string(),
    artists: z.string(),
    duration: z.string(),
    thumbnail: z.string().url(),
});

export type Song = z.infer<typeof Song>;
