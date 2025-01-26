# YT Music API

The **YT Music API** is a lightweight npm package for interacting with YouTube Music. It provides basic functionalities like searching for songs and retrieving upcoming tracks. This package is easy to integrate into your JavaScript projects and offers a simple API for working with YouTube Music.

### Features
- **Search**: Search for songs using keywords.
- **Get Up Next**: Retrieve upcoming tracks for a specific video.

### Installation
To install the package, run the following command:

```bash
npm install lite-ytmusic-api
```

### Usage
```js
import YTMusicAPI from "lite-ytmusic-api";

const ytmusic = new YTMusicAPI();

(async () => {
  // Initialize the API (pass custom cookies if required)
  await ytmusic.initialize(/* Custom cookies (Optional) */);
  
  // Search for songs
  const data = await ytmusic.searchSongs("Never Gonna Give You Up");
  console.log(data);

  // Get the "Up Next" list for a given video ID
  ytmusic.getUpNexts("Gn1X0V-T7ro").then(response => {
    console.log(response);
  });
})();
```

### Upcoming Features
- **Music Download**: The ability to download music will be added in the next update.

### License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### Contributing
Contributions are welcome! Feel free to fork this repository, open issues, and submit pull requests.
