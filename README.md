# :notes: Spotify Client for Mac OS X :notes:
A nodejs app to control Spotify without leaving your terminal. Only works with Mac Os as it relies on AppleScript behind the scenes to communicate with the Spotify app.

# Installation
    npm install spotify-cli-mac -g
Client will be available under the alias `spotify`

# Demo
![demo image](http://i.giphy.com/l3q2vUslrmITQBuq4.gif "demo image")
# Usage
    spotify
  Commands:

    search|s <type> [query...]  Search for a <track (t) | artist (ar) | album (al) | playlist (p) > (searches tracks by default)
    info|i                      Display information about the current track along with player status
    play [uri]                  Continue playing current track or play the track with the provided URI
    pause                       Pause the current track
    next|n                      Play the next track in the queue
    back|b                      Play the previous track
    mute|m                      Mute player
    unmute|u                    Unmute player
    volume|v                    Display player volume
    + [deltaVolume]             Turn the volume up by given amount (0-100), default:10
    - [deltaVolume]             Turn the volume down by given amount (0-100), default:10
    p                           Toggle play/pause
    replay|r                    Replay current track
    position|pos [newPosition]  Get or set player position [mm:ss], e.g: pos 1:23
    quit|q                      Quit Spotify :(
    open|o                      Open Spotify :)
    shuffle|ts                  Toggle shuffle on/off
    repeat|tr                   Toggle repeat on/off
    share|sh [type]             Display share <uri|url> and copy value to clipboard
    lyrics|ly                   Display the lyrics of currently playing track

  Options:

    -h, --help     output usage information
    -V, --version  output the version number

# Displaying Lyrics
In order to be able to use the `lyrics` command, you will need to get a `Client Access Token` for the `Genius API`.
Sign up for API access here: https://genius.com/api-clients

Once you have your client access token, edit the `config.json` found under `/usr/local/lib/node_modules/spotify-cli-mac/`


*Contributions and feedback are welcome and encouraged!*
