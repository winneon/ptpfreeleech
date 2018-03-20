# ptpfreeleech

PTPFreeleech is a Node.js script that checks currently available PassThePopcorn freeleech torrents and runs a few checks against them. If the checks pass, the torrent's information is logged to the console and (optionally) auto-downloaded or logged to a Discord webhook.

## Features

* Automatically download freeleech torrents to a specified path.
* Log freeleech torrent information to Discord in a pleasing format.
* Restrict search parameters using provided criteria & filters.

## Installation

### Preprequistes

The following packages must be installed for this script to function.

* Node.js 8.4.0 or later
* npm or yarn, latest possible version

---

Assuming the above prerequistes are met, run the following command(s) to install the script's dependencies. Be sure to be within the script's working directory.

```bash
$ npm install # Run if using npm.
$ yarn install # Run if using yarn.
```

## Configuration

Below is an example `config.example.json`. Rename `config.example.json` to `config.json` and edit the required values to your needs.

```javascript
{
  "username": "", // PassThePopcorn username credential.
  "password": "", // PassThePopcorn password credential.
  "passkey": "", // PassThePopcorn passkey credential. View on your profile in the Personal section.
  "minseeders": -1, // Minimum amount of seeders. Set to -1 for unlimited.
  "maxseeders": -1, // Maximum amount of seeders. Set to -1 for unlimited.
  "minleechers": -1, // Minimum amount of leechers. Set to -1 for unlimited.
  "maxleechers": -1, // Maximum amount of leechers. Set to -1 for unlimited.
  "minsize": -1, // Minimum size in megabytes. Set to -1 for unlimited.
  "maxsize": -1, // Maximum size in megabytes. Set to -1 for unlimited.
  "discord": "", // Discord webhook URI. Optional.
  "autodownload": "" // Automatically download .torrent files in a specified path. Optional.
}
```

## Usage

To start the script, run the following command within the script's working directory.

```bash
$ npm run start # Run if using npm.
$ yarn run start # Run if using yarn.
```
