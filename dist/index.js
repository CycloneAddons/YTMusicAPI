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
    var traverse = (data, ...keys) => {
      const again = (data2, key, deadEnd = false) => {
        const res = [];
        if (data2 instanceof Object && key in data2) {
          res.push(data2[key]);
          if (deadEnd) return res.length === 1 ? res[0] : res;
        }
        if (data2 instanceof Array) {
          res.push(...data2.map((v) => again(v, key)).flat());
        } else if (data2 instanceof Object) {
          res.push(
            ...Object.keys(data2).map((k) => again(data2[k], key)).flat()
          );
        }
        return res.length === 1 ? res[0] : res;
      };
      let value = data;
      const lastKey = keys.at(-1);
      for (const key of keys) {
        value = again(value, key, lastKey === key);
      }
      return value;
    };
    var traverseList = (data, ...keys) => {
      return [traverse(data, ...keys)].flat();
    };
    const contents = traverseList(searchData, "musicResponsiveListItemRenderer");
    if (!contents || !Array.isArray(contents)) throw new Error("Invalid response structure");
    return contents.map((renderer) => {
      if (!renderer) throw new Error("Invalid item structure");
      const menuRenderer = _optionalChain([renderer, 'access', _ => _.menu, 'optionalAccess', _2 => _2.menuRenderer, 'optionalAccess', _3 => _3.items, 'optionalAccess', _4 => _4[0], 'optionalAccess', _5 => _5.menuNavigationItemRenderer, 'optionalAccess', _6 => _6.navigationEndpoint, 'optionalAccess', _7 => _7.watchEndpoint]);
      const flexColumns = renderer.flexColumns;
      const primaryText = _optionalChain([flexColumns, 'optionalAccess', _8 => _8[0], 'optionalAccess', _9 => _9.musicResponsiveListItemFlexColumnRenderer, 'optionalAccess', _10 => _10.text, 'optionalAccess', _11 => _11.runs, 'optionalAccess', _12 => _12[0], 'optionalAccess', _13 => _13.text]);
      const secondaryText = _optionalChain([flexColumns, 'optionalAccess', _14 => _14[1], 'optionalAccess', _15 => _15.musicResponsiveListItemFlexColumnRenderer, 'optionalAccess', _16 => _16.text]);
      const artists = _optionalChain([secondaryText, 'optionalAccess', _17 => _17.accessibility, 'optionalAccess', _18 => _18.accessibilityData, 'optionalAccess', _19 => _19.label, 'access', _20 => _20.split, 'call', _21 => _21(" \u2022 "), 'optionalAccess', _22 => _22[0]]);
      const duration = _optionalChain([secondaryText, 'optionalAccess', _23 => _23.runs, 'optionalAccess', _24 => _24.at, 'call', _25 => _25(-1), 'optionalAccess', _26 => _26.text]);
      const thumbnail = _optionalChain([renderer, 'access', _27 => _27.thumbnail, 'optionalAccess', _28 => _28.musicThumbnailRenderer, 'optionalAccess', _29 => _29.thumbnail, 'optionalAccess', _30 => _30.thumbnails, 'optionalAccess', _31 => _31.at, 'call', _32 => _32(-1), 'optionalAccess', _33 => _33.url]);
      return {
        type: "SONG",
        videoId: _optionalChain([menuRenderer, 'optionalAccess', _34 => _34.videoId]) || "Unknown",
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
    const tabs = _optionalChain([data, 'optionalAccess', _35 => _35.contents, 'optionalAccess', _36 => _36.singleColumnMusicWatchNextResultsRenderer, 'optionalAccess', _37 => _37.tabbedRenderer, 'optionalAccess', _38 => _38.watchNextTabbedResultsRenderer, 'optionalAccess', _39 => _39.tabs]);
    if (!tabs || !_optionalChain([tabs, 'access', _40 => _40[0], 'optionalAccess', _41 => _41.tabRenderer, 'optionalAccess', _42 => _42.content, 'optionalAccess', _43 => _43.musicQueueRenderer, 'optionalAccess', _44 => _44.content, 'optionalAccess', _45 => _45.playlistPanelRenderer, 'optionalAccess', _46 => _46.contents])) {
      throw new Error("Invalid response structure");
    }
    const contents = tabs[0].tabRenderer.content.musicQueueRenderer.content.playlistPanelRenderer.contents;
    return contents.slice(1).map(({ playlistPanelVideoRenderer: { videoId: videoId2, title, shortBylineText, lengthText, thumbnail } }) => ({
      type: "SONG",
      videoId: videoId2,
      title: _optionalChain([title, 'optionalAccess', _47 => _47.runs, 'access', _48 => _48[0], 'optionalAccess', _49 => _49.text]) || "Unknown",
      artists: _optionalChain([shortBylineText, 'optionalAccess', _50 => _50.runs, 'access', _51 => _51[0], 'optionalAccess', _52 => _52.text]) || "Unknown",
      duration: _optionalChain([lengthText, 'optionalAccess', _53 => _53.runs, 'access', _54 => _54[0], 'optionalAccess', _55 => _55.text]) || "Unknown",
      thumbnail: _optionalChain([thumbnail, 'optionalAccess', _56 => _56.thumbnails, 'access', _57 => _57.at, 'call', _58 => _58(-1), 'optionalAccess', _59 => _59.url]) || "Unknown"
    }));
  }
};

// src/index.ts
var index_default = YTMusicAPI;


exports.default = index_default;

module.exports = exports.default;
//# sourceMappingURL=index.js.map