// src/YTMusicAPI.ts
import axios from "axios";
import { Cookie, CookieJar } from "tough-cookie";
axios.defaults.headers.common["Accept-Encoding"] = "gzip";
var YTMusicAPI = class {
  cookiejar;
  config;
  client;
  /**
   * Creates an instance of YTMusicAPI
   * Make sure to call initialize()
   */
  constructor() {
    this.cookiejar = new CookieJar();
    this.config = {};
    this.client = axios.create({
      baseURL: "https://music.youtube.com/",
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.129 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.5"
      },
      withCredentials: true
    });
    this.client.interceptors.request.use((req) => {
      if (req.baseURL) {
        const cookieString = this.cookiejar.getCookieStringSync(req.baseURL);
        if (cookieString) {
          req.headers["cookie"] = cookieString;
        }
      }
      return req;
    });
    this.client.interceptors.response.use((res) => {
      if (res.headers && res.config.baseURL) {
        const cookieStrings = res.headers["set-cookie"] || [];
        for (const cookieString of cookieStrings) {
          const cookie = Cookie.parse(cookieString);
          if (cookie) {
            this.cookiejar.setCookieSync(cookie, res.config.baseURL);
          }
        }
      }
      return res;
    });
  }
  /**
   * Initializes the API
   */
  async initialize(options) {
    const { cookies, GL, HL } = options ?? {};
    if (cookies) {
      for (const cookieString of cookies.split("; ")) {
        const cookie = Cookie.parse(cookieString);
        if (cookie) {
          this.cookiejar.setCookieSync(cookie, "https://www.youtube.com/");
        }
      }
    }
    const html = (await this.client.get("/")).data;
    const setConfigs = html.match(/ytcfg\.set\(.*\)/) || [];
    const configs = setConfigs.map((c) => c.slice(10, -1)).map((s) => {
      try {
        return JSON.parse(s);
      } catch {
        return null;
      }
    }).filter(Boolean);
    this.config = configs.reduce((acc, config) => ({ ...acc, ...config }), this.config || {});
    if (this.config) {
      if (GL) this.config.GL = GL;
      if (HL) this.config.HL = HL;
    }
    return this;
  }
  /**
   * Constructs a basic YouTube Music API request with all essential headers
   * and body parameters needed to make the API work
   *
   * @param endpoint Endpoint for the request
   * @param body Body
   * @param query Search params
   * @returns Raw response from YouTube Music API which needs to be parsed
   */
  async constructRequest(endpoint, body = {}, query = {}) {
    if (!this.config) {
      throw new Error("API not initialized. Make sure to call the initialize() method first");
    }
    const headers = {
      ...this.client.defaults.headers,
      "x-origin": this.client.defaults.baseURL,
      "X-Goog-Visitor-Id": this.config.VISITOR_DATA || "",
      "X-YouTube-Client-Name": this.config.INNERTUBE_CONTEXT_CLIENT_NAME,
      "X-YouTube-Client-Version": this.config.INNERTUBE_CLIENT_VERSION,
      "X-YouTube-Device": this.config.DEVICE,
      "X-YouTube-Page-CL": this.config.PAGE_CL,
      "X-YouTube-Page-Label": this.config.PAGE_BUILD_LABEL,
      "X-YouTube-Utc-Offset": String(-(/* @__PURE__ */ new Date()).getTimezoneOffset()),
      "X-YouTube-Time-Zone": new Intl.DateTimeFormat().resolvedOptions().timeZone
    };
    const searchParams = new URLSearchParams({
      ...query,
      alt: "json",
      key: this.config.INNERTUBE_API_KEY
    });
    const res = await this.client.post(
      `youtubei/${this.config.INNERTUBE_API_VERSION}/${endpoint}?${searchParams.toString()}`,
      {
        context: {
          capabilities: {},
          client: {
            clientName: this.config.INNERTUBE_CLIENT_NAME,
            clientVersion: this.config.INNERTUBE_CLIENT_VERSION,
            experimentIds: [],
            experimentsToken: "",
            gl: this.config.GL,
            hl: this.config.HL,
            locationInfo: {
              locationPermissionAuthorizationStatus: "LOCATION_PERMISSION_AUTHORIZATION_STATUS_UNSUPPORTED"
            },
            musicAppInfo: {
              musicActivityMasterSwitch: "MUSIC_ACTIVITY_MASTER_SWITCH_INDETERMINATE",
              musicLocationMasterSwitch: "MUSIC_LOCATION_MASTER_SWITCH_INDETERMINATE",
              pwaInstallabilityStatus: "PWA_INSTALLABILITY_STATUS_UNKNOWN"
            },
            utcOffsetMinutes: -(/* @__PURE__ */ new Date()).getTimezoneOffset()
          },
          request: {
            internalExperimentFlags: [
              {
                key: "force_music_enable_outertube_tastebuilder_browse",
                value: "true"
              },
              {
                key: "force_music_enable_outertube_playlist_detail_browse",
                value: "true"
              },
              {
                key: "force_music_enable_outertube_search_suggestions",
                value: "true"
              }
            ],
            sessionIndex: {}
          },
          user: {
            enableSafetyMode: false
          }
        },
        ...body
      },
      {
        responseType: "json",
        headers
      }
    );
    return "responseContext" in res.data ? res.data : res;
  }
  /**
   * Searches YouTube Music API for songs
   *
   * @param query Query string
   * @returns Array of songs
   */
  async searchSongs(query) {
    if (!query || typeof query !== "string") throw new Error("Invalid query");
    const searchData = await this.constructRequest("search", {
      query,
      params: "Eg-KAQwIARAAGAAgACgAMABqChAEEAMQCRAFEAo%3D"
    });
    const contents = searchData?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.musicShelfRenderer?.contents;
    if (!contents || !Array.isArray(contents)) throw new Error("Invalid response structure");
    return contents.map((song) => {
      const renderer = song.musicResponsiveListItemRenderer;
      if (!renderer) throw new Error("Invalid item structure");
      const menuRenderer = renderer.menu?.menuRenderer?.items?.[0]?.menuNavigationItemRenderer?.navigationEndpoint?.watchEndpoint;
      const flexColumns = renderer.flexColumns;
      const primaryText = flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
      const secondaryText = flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text;
      const artists = secondaryText?.accessibility?.accessibilityData?.label.split(" \u2022 ")?.[0];
      const duration = secondaryText?.runs?.at(-1)?.text;
      const thumbnail = renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.at(-1)?.url;
      return {
        type: "SONG",
        videoId: menuRenderer?.videoId || "Unknown",
        title: primaryText || "Unknown",
        artists: artists || "Unknown",
        duration: duration || "Unknown",
        thumbnail: thumbnail || "Unknown"
      };
    });
  }
  /**
    * Get all possible information of a Up Nexts Song
    *
    * @param videoId Video ID
    * @returns Up Nexts Data
    */
  async getUpNexts(videoId) {
    if (!/^[a-zA-Z0-9-_]{11}$/.test(videoId)) throw new Error("Invalid videoId");
    const data = await this.constructRequest("next", {
      videoId,
      playlistId: `RDAMVM${videoId}`,
      isAudioOnly: true
    });
    const tabs = data?.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs;
    if (!tabs || !tabs[0]?.tabRenderer?.content?.musicQueueRenderer?.content?.playlistPanelRenderer?.contents) {
      throw new Error("Invalid response structure");
    }
    const contents = tabs[0].tabRenderer.content.musicQueueRenderer.content.playlistPanelRenderer.contents;
    return contents.slice(1).map(({ playlistPanelVideoRenderer: { videoId: videoId2, title, shortBylineText, lengthText, thumbnail } }) => ({
      type: "SONG",
      videoId: videoId2,
      title: title?.runs[0]?.text || "Unknown",
      artists: shortBylineText?.runs[0]?.text || "Unknown",
      duration: lengthText?.runs[0]?.text || "Unknown",
      thumbnail: thumbnail?.thumbnails.at(-1)?.url || "Unknown"
    }));
  }
};

// src/index.ts
var index_default = YTMusicAPI;
export {
  index_default as default
};
//# sourceMappingURL=index.mjs.map