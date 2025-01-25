import { z } from 'zod';

declare const Song: z.ZodObject<{
    type: z.ZodLiteral<"SONG">;
    videoId: z.ZodString;
    title: z.ZodString;
    artists: z.ZodString;
    duration: z.ZodString;
    thumbnail: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type?: "SONG";
    videoId?: string;
    title?: string;
    artists?: string;
    duration?: string;
    thumbnail?: string;
}, {
    type?: "SONG";
    videoId?: string;
    title?: string;
    artists?: string;
    duration?: string;
    thumbnail?: string;
}>;
type Song = z.infer<typeof Song>;

declare class YTMusicAPI {
    private cookiejar;
    private config?;
    private client;
    /**
     * Creates an instance of YTMusicAPI
     * Make sure to call initialize()
     */
    constructor();
    /**
     * Initializes the API
     */
    initialize(options?: {
        cookies?: string;
        GL?: string;
        HL?: string;
    }): Promise<this>;
    /**
     * Constructs a basic YouTube Music API request with all essential headers
     * and body parameters needed to make the API work
     *
     * @param endpoint Endpoint for the request
     * @param body Body
     * @param query Search params
     * @returns Raw response from YouTube Music API which needs to be parsed
     */
    private constructRequest;
    /**
     * Searches YouTube Music API for songs
     *
     * @param query Query string
     * @returns Array of songs
     */
    searchSongs(query: string): Promise<Song[]>;
    /**
      * Get all possible information of a Up Nexts Song
      *
      * @param videoId Video ID
      * @returns Up Nexts Data
      */
    getUpNexts(videoId: string): Promise<Song[]>;
}

export { Song, YTMusicAPI as default };
