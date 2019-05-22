'use strict';

const program = require('commander');
const osascript = require('node-osascript');
const spotify = require('spotify-web-api-node');
const _ = require('lodash');
const prompt = require('prompt');
const parseSearchResults = require('./parsers/');
const printer = require('./printers/');
const spotifyClient = require('./osascripts/');

// need client access token for genius
let lyricist = require('lyricist');
if(process.env['GeniusClientAccessToken']){
	lyricist = lyricist(process.env['GeniusClientAccessToken']);
}

const spotifyApi = new spotify();

const SearchOptions = {
	'track': {
		'fn': spotifyApi.searchTracks.bind(spotifyApi),
		'type': 'tracks'
	},
	't': {
		'fn': spotifyApi.searchTracks.bind(spotifyApi),
		'type': 'tracks'
	},
	'artist': {
		'fn': spotifyApi.searchArtists.bind(spotifyApi),
		'type': 'artists'
	},
	'ar': {
		'fn': spotifyApi.searchArtists.bind(spotifyApi),
		'type': 'artists'
	},
	'album': {
		'fn': spotifyApi.searchAlbums.bind(spotifyApi),
		'type': 'albums'
	},
	'al': {
		'fn': spotifyApi.searchAlbums.bind(spotifyApi),
		'type': 'albums'
	},
	'playlist': {
		'fn': spotifyApi.searchPlaylists.bind(spotifyApi),
		'type': 'playlists'
	},
	'p': {
		'fn': spotifyApi.searchPlaylists.bind(spotifyApi),
		'type': 'playlists'
	}
};

program
	.version('0.0.1')
	.command('search <type> [query...]')
	.description('Search for a <track (t) | artist (ar) | album (al) | playlist (p) > (searches tracks by default)')
	.alias('s')
	.action((type, query) => {
		// search for tracks by default
		var searchFn = SearchOptions['track'].fn;
		var searchQry = `${type} ${query.join(' ')}`;
		var resultType = SearchOptions['track'].type;

		if (SearchOptions[type]){
			searchFn = SearchOptions[type].fn;
			searchQry = query.join(' ');
			resultType = SearchOptions[type].type;
		}

		searchFn(searchQry).then((data) => {
			var results = parseSearchResults(resultType, data);
			printer.printSearchResults(resultType, results);
			prompt.start();
			prompt.get(['selection'], function (err, result) {
				if(results[result.selection-1]){
					var selectedSpotifyURI = results[result.selection-1].spotifyURI;
					spotifyClient.play(selectedSpotifyURI).then((result) => {
						spotifyClient.status().then((result) => {
							printer.printPlayerStatus(result);
						});
					});
				}
			});
		});
	});

program
	.command('info')
	.alias('i')
	.description('Display information about the current track along with player status')
	.action(() => {
		spotifyClient.status().then((result) => {
			printer.printPlayerStatus(result);
		});
	})

program
	.command('play [uri]')
	.description('Continue playing current track or play the track with the provided URI')
	.action((uri) => {
		if(uri){
			spotifyClient.play(uri).then(() => {
				spotifyClient.status().then((result) => {
					printer.printPlayerStatus(result);
				});
			});
		} else {
			spotifyClient.play().then(() => {
				spotifyClient.status().then((result) => {
					printer.printPlayerStatus(result);
				});
			})
		}
	})


program
	.command('pause')
	.description('Pause the current track')
	.action(() => {
		spotifyClient.pause().then((result) => {
			spotifyClient.status().then((result) => {
				printer.printPlayerStatus(result);
			});
		})
	})

program
	.command('next')
	.alias('n')
	.description('Play the next track in the queue')
	.action(() => {
		spotifyClient.next().then((result) => {
			spotifyClient.status().then((result) => {
				printer.printNext(result);
			});
		})
	})

program
	.command('back')
	.alias('b')
	.description('Play the previous track')
	.action(() => {
		spotifyClient.previous().then((result) => {
			spotifyClient.status().then((result) => {
				printer.printPrevious(result);
			});
		})
	})

program
	.command('mute')
	.alias('m')
	.description('Mute player')
	.action(() => {
		spotifyClient.mute().then((result) => {
			spotifyClient.getVolume().then((result) => {
				printer.printMute(result);
			});
		})
	})

program
	.command('unmute')
	.alias('u')
	.description('Unmute player')
	.action(() => {
		spotifyClient.unmute().then((result) => {
			spotifyClient.getVolume().then((result) => {
				printer.printUnmute(result);
			});
		})
	})

program
	.command('volume [newVolume]')
	.alias('v')
	.description('Display player volume')
	.action((newVolume) => {
		if(newVolume){
			spotifyClient.setVolume(newVolume).then((result) => {
				spotifyClient.getVolume().then((result) => {
					printer.printSetVolume(result);
				});
			})
		} else {
			spotifyClient.getVolume().then((result) => {
				spotifyClient.getVolume().then((result) => {
					printer.printVolume(result);
				});
			})
		}
	})

program
	.command('+ [deltaVolume]')
	.description('Turn the volume up by given amount (0-100), default:10')
	.action((deltaVolume) => {
		var changeInVolume = deltaVolume ? deltaVolume : 10;
		spotifyClient.changeVolume(changeInVolume).then((result) => {
			spotifyClient.getVolume().then((result) => {
				printer.printVolumeIncrease(changeInVolume, result);
			});
		})
	})

program
	.command('- [deltaVolume]')
	.description('Turn the volume down by given amount (0-100), default:10')
	.action((deltaVolume) => {
		var changeInVolume = deltaVolume ? -deltaVolume : -10;
		spotifyClient.changeVolume(changeInVolume).then((result) => {
			spotifyClient.getVolume().then((result) => {
				printer.printVolumeDecrease(changeInVolume, result);
			});
		})
	})

program
	.command('p')
	.description('Toggle play/pause')
	.action(() => {
		spotifyClient.togglePlayPause().then(() => {
			spotifyClient.status().then((result) => {
				printer.printPlayerStatus(result);
			});
		});
	});

program
	.command('replay')
	.alias('r')
	.description('Replay current track')
	.action(() => {
		spotifyClient.replay();
	})

program
	.command('position [newPosition]')
	.alias('pos')
	.description('Get or set player position [mm:ss], e.g: pos 1:23')
	.action((newPosition) => {
		if(newPosition){
			spotifyClient.setPosition(newPosition);
		} else {
			spotifyClient.getPosition().then((position) => {
				console.log(position);
			})
		}
	});

program
	.command('quit')
	.alias('q')
	.description('Quit Spotify :(')
	.action(() =>{
		spotifyClient.quit();
	});

program
	.command('open')
	.alias('o')
	.description('Open Spotify :)')
	.action(() =>{
		spotifyClient.start();
	});

program
	.command('shuffle')
	.alias('ts')
	.description('Toggle shuffle on/off')
	.action(() => {
		spotifyClient.shuffle().then((status) => {
			console.log(status);
		});
	})

program
	.command('repeat')
	.alias('tr')
	.description('Toggle repeat on/off')
	.action(() => {
		spotifyClient.repeat().then((status) => {
			console.log(status);
		});
	})

program
	.command('share [type]')
	.alias('sh')
	.description('Display share <uri|url> and copy value to clipboard')
	.action((type) => {
		spotifyClient.share(type);
	})

program
	.command('lyrics')
	.alias('ly')
	.description('Display the lyrics of currently playing track')
	.action((type) => {
		spotifyClient.status().then((trackInfo) => {
			if(!process.env['GeniusClientAccessToken']){
				console.log('You need to set the Client Access Token for Genius API.');
				console.log('Sign up for API access here: https://genius.com/api-clients');
				console.log('add key to your environment variables: export GeniusClientAccessToken=YourClientAccessTokenHere')
				return;
			}
			lyricist.song({search: `${trackInfo.artist} ${trackInfo.track}`}, function (err, song) {
				if(err){
					console.log(`Could not find lyrics for track: ${trackInfo.track} - ${trackInfo.artist}`);
				} else {
					console.log(`${trackInfo.track} - ${trackInfo.artist} Lyrics`)
					console.log(song.lyrics);
				}
			});
		})
	})

program.parse(process.argv);
