"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }// src/YTMusicAPI.ts
var _axios = require('axios'); var _axios2 = _interopRequireDefault(_axios);
var _toughcookie = require('tough-cookie');
_axios2.default.defaults.headers.common["Accept-Encoding"] = "gzip";
var YTMusicAPI = class {
  
  
  
  /**
   * Creates an instance of YTMusicAPI
   * Make sure to call initialize()
   */
  constructor() {
    this.cookiejar = new (0, _toughcookie.CookieJar)();
    this.config = {};
    this.client = _axios2.default.create({
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
          const cookie = _toughcookie.Cookie.parse(cookieString);
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
    const { cookies, GL, HL } = _nullishCoalesce(options, () => ( {}));
    if (cookies) {
      for (const cookieString of cookies.split("; ")) {
        const cookie = _toughcookie.Cookie.parse(cookieString);
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
      } catch (e) {
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
    const contents = _optionalChain([searchData, 'optionalAccess', _ => _.contents, 'optionalAccess', _2 => _2.tabbedSearchResultsRenderer, 'optionalAccess', _3 => _3.tabs, 'optionalAccess', _4 => _4[0], 'optionalAccess', _5 => _5.tabRenderer, 'optionalAccess', _6 => _6.content, 'optionalAccess', _7 => _7.sectionListRenderer, 'optionalAccess', _8 => _8.contents, 'optionalAccess', _9 => _9[0], 'optionalAccess', _10 => _10.musicShelfRenderer, 'optionalAccess', _11 => _11.contents]);
    if (!contents || !Array.isArray(contents)) throw new Error("Invalid response structure");
    return contents.map((song) => {
      const renderer = song.musicResponsiveListItemRenderer;
      if (!renderer) throw new Error("Invalid item structure");
      const menuRenderer = _optionalChain([renderer, 'access', _12 => _12.menu, 'optionalAccess', _13 => _13.menuRenderer, 'optionalAccess', _14 => _14.items, 'optionalAccess', _15 => _15[0], 'optionalAccess', _16 => _16.menuNavigationItemRenderer, 'optionalAccess', _17 => _17.navigationEndpoint, 'optionalAccess', _18 => _18.watchEndpoint]);
      const flexColumns = renderer.flexColumns;
      const primaryText = _optionalChain([flexColumns, 'optionalAccess', _19 => _19[0], 'optionalAccess', _20 => _20.musicResponsiveListItemFlexColumnRenderer, 'optionalAccess', _21 => _21.text, 'optionalAccess', _22 => _22.runs, 'optionalAccess', _23 => _23[0], 'optionalAccess', _24 => _24.text]);
      const secondaryText = _optionalChain([flexColumns, 'optionalAccess', _25 => _25[1], 'optionalAccess', _26 => _26.musicResponsiveListItemFlexColumnRenderer, 'optionalAccess', _27 => _27.text]);
      const artists = _optionalChain([secondaryText, 'optionalAccess', _28 => _28.accessibility, 'optionalAccess', _29 => _29.accessibilityData, 'optionalAccess', _30 => _30.label, 'access', _31 => _31.split, 'call', _32 => _32(" \u2022 "), 'optionalAccess', _33 => _33[0]]);
      const duration = _optionalChain([secondaryText, 'optionalAccess', _34 => _34.runs, 'optionalAccess', _35 => _35.at, 'call', _36 => _36(-1), 'optionalAccess', _37 => _37.text]);
      const thumbnail = _optionalChain([renderer, 'access', _38 => _38.thumbnail, 'optionalAccess', _39 => _39.musicThumbnailRenderer, 'optionalAccess', _40 => _40.thumbnail, 'optionalAccess', _41 => _41.thumbnails, 'optionalAccess', _42 => _42.at, 'call', _43 => _43(-1), 'optionalAccess', _44 => _44.url]);
      return {
        type: "SONG",
        videoId: _optionalChain([menuRenderer, 'optionalAccess', _45 => _45.videoId]) || "Unknown",
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
    const tabs = _optionalChain([data, 'optionalAccess', _46 => _46.contents, 'optionalAccess', _47 => _47.singleColumnMusicWatchNextResultsRenderer, 'optionalAccess', _48 => _48.tabbedRenderer, 'optionalAccess', _49 => _49.watchNextTabbedResultsRenderer, 'optionalAccess', _50 => _50.tabs]);
    if (!tabs || !_optionalChain([tabs, 'access', _51 => _51[0], 'optionalAccess', _52 => _52.tabRenderer, 'optionalAccess', _53 => _53.content, 'optionalAccess', _54 => _54.musicQueueRenderer, 'optionalAccess', _55 => _55.content, 'optionalAccess', _56 => _56.playlistPanelRenderer, 'optionalAccess', _57 => _57.contents])) {
      throw new Error("Invalid response structure");
    }
    const contents = tabs[0].tabRenderer.content.musicQueueRenderer.content.playlistPanelRenderer.contents;
    return contents.slice(1).map(({ playlistPanelVideoRenderer: { videoId: videoId2, title, shortBylineText, lengthText, thumbnail } }) => ({
      type: "SONG",
      videoId: videoId2,
      title: _optionalChain([title, 'optionalAccess', _58 => _58.runs, 'access', _59 => _59[0], 'optionalAccess', _60 => _60.text]) || "Unknown",
      artists: _optionalChain([shortBylineText, 'optionalAccess', _61 => _61.runs, 'access', _62 => _62[0], 'optionalAccess', _63 => _63.text]) || "Unknown",
      duration: _optionalChain([lengthText, 'optionalAccess', _64 => _64.runs, 'access', _65 => _65[0], 'optionalAccess', _66 => _66.text]) || "Unknown",
      thumbnail: _optionalChain([thumbnail, 'optionalAccess', _67 => _67.thumbnails, 'access', _68 => _68.at, 'call', _69 => _69(-1), 'optionalAccess', _70 => _70.url]) || "Unknown"
    }));
  }
};

// src/index.ts
var index_default = YTMusicAPI;


exports.default = index_default;

module.exports = exports.default;
//# sourceMappingURL=index.js.map