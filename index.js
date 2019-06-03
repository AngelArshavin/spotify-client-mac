#! /usr/bin/env node
'use strict';

const program = require('commander');
const spotify = require('spotify-web-api-node');
const prompt = require('prompt');
const parseSearchResults = require('./parsers/');
const printer = require('./printers/');
const spotifyClient = require('./osascripts/');
const nconf = require('nconf');
const path = require('path');
const readlineSync = require('readline-sync');
const fetchLyrics = require('./fetch_lyrics').fetchLyrics;
const version = require('./package.json').version;
const semver = require('semver');
nconf.file(path.join(__dirname, '/config.json'));

// need client access token for genius
let lyricist = require('lyricist/node6');

let GENIUS_API_KEY = nconf.get('GeniusAPIClientKey');
let GENIUS_API_KEY_SET = GENIUS_API_KEY !== 'YOUR_CLIENT_ACCESS_TOKEN_HERE';
if(GENIUS_API_KEY_SET){
	lyricist = new lyricist(GENIUS_API_KEY);
}

let SPOTIFY_CLIENT_ID = nconf.get('spotifyClientID');
let SPOTIFY_CLIENT_ID_SET = SPOTIFY_CLIENT_ID !== 'YOUR_SPOTIFY_CLIENT_ID_HERE';
let SPOTIFY_CLIENT_SECRET = nconf.get('spotifyClientSecret');
let SPOTIFY_CLIENT_SECRET_SET = SPOTIFY_CLIENT_SECRET !== 'YOUR_SPOTIFY_CLIENT_SECRET_HERE';
let spotifyApi = null;

const initSpotifyApi = (client_id, client_secret) => {
	return new spotify({
		clientId : client_id,
		clientSecret : client_secret
	});
};

const setTokens = () => {
	let clientId = readlineSync.question('What is your Spotify Client ID? \n', { hideEchoBack: true });
	let clientSecret = readlineSync.question('What is your Spotify Client Secret? \n', { hideEchoBack: true });
	nconf.set('spotifyClientID', clientId);
	nconf.set('spotifyClientSecret', clientSecret);
	nconf.save();
	printer.printConfig();
};

if(SPOTIFY_CLIENT_ID_SET && SPOTIFY_CLIENT_SECRET_SET) {
	spotifyApi = initSpotifyApi(SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET);
}
else {
	setTokens();
	let SPOTIFY_CLIENT_ID = nconf.get('spotifyClientID');
	let SPOTIFY_CLIENT_SECRET = nconf.get('spotifyClientSecret');
	spotifyApi = initSpotifyApi(SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET);
}

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
	.version(version)
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

		// Retrieve an access token.
		spotifyApi.clientCredentialsGrant()
			.then(function(data) {
				spotifyApi.setAccessToken(data.body['access_token']);
				searchFn(searchQry).then((data) => {
					var results = parseSearchResults(resultType, data);
					printer.printSearchResults(resultType, results);
					prompt.start();
					prompt.get(['selection'], function (err, result) {
						if (err) {
							return process.stdout.write('\n');
						}
						if(results[result.selection-1]){
							var selectedSpotifyURI = results[result.selection-1].spotifyURI;
							spotifyClient.play(selectedSpotifyURI).then(() => {
								spotifyClient.status().then((result) => {
									printer.printPlayerStatus(result);
								});
							});
						}
					});
				});
			}, function(err) {
				console.log('Something went wrong when retrieving an access token', err);
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
	});

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
		}
		else {
			spotifyClient.play().then(() => {
				spotifyClient.status().then((result) => {
					printer.printPlayerStatus(result);
				});
			});
		}
	});


program
	.command('pause')
	.description('Pause the current track')
	.action(() => {
		spotifyClient.pause().then(() => {
			spotifyClient.status().then((result) => {
				printer.printPlayerStatus(result);
			});
		});
	});

program
	.command('next')
	.alias('n')
	.description('Play the next track in the queue')
	.action(() => {
		spotifyClient.next().then(() => {
			spotifyClient.status().then((result) => {
				printer.printNext(result);
			});
		});
	});

program
	.command('back')
	.alias('b')
	.description('Play the previous track')
	.action(() => {
		spotifyClient.previous().then(() => {
			spotifyClient.status().then((result) => {
				printer.printPrevious(result);
			});
		});
	});

program
	.command('mute')
	.alias('m')
	.description('Mute player')
	.action(() => {
		spotifyClient.mute().then(() => {
			spotifyClient.getVolume().then((result) => {
				printer.printMute(result);
			});
		});
	});

program
	.command('unmute')
	.alias('u')
	.description('Unmute player')
	.action(() => {
		spotifyClient.unmute().then(() => {
			spotifyClient.getVolume().then((result) => {
				printer.printUnmute(result);
			});
		});
	});

program
	.command('volume [newVolume]')
	.alias('v')
	.description('Display player volume')
	.action((newVolume) => {
		if(newVolume){
			spotifyClient.setVolume(newVolume).then(() => {
				spotifyClient.getVolume().then((result) => {
					printer.printSetVolume(result);
				});
			});
		}
		else {
			spotifyClient.getVolume().then(() => {
				spotifyClient.getVolume().then((result) => {
					printer.printVolume(result);
				});
			});
		}
	});
program
	.command('+ [deltaVolume]')
	.description('Turn the volume up by given amount (0-100), default:10')
	.action((deltaVolume) => {
		var changeInVolume = deltaVolume ? deltaVolume : 10;
		spotifyClient.changeVolume(changeInVolume).then(() => {
			spotifyClient.getVolume().then((result) => {
				printer.printVolumeIncrease(changeInVolume, result);
			});
		});
	});

program
	.command('- [deltaVolume]')
	.description('Turn the volume down by given amount (0-100), default:10')
	.action((deltaVolume) => {
		var changeInVolume = deltaVolume ? -deltaVolume : -10 ;
		spotifyClient.changeVolume(changeInVolume).then(() => {
			spotifyClient.getVolume().then((result) => {
				printer.printVolumeDecrease(changeInVolume, result);
			});
		});
	});

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
		spotifyClient.replay().then(() => {
			spotifyClient.status().then((result) => {
				printer.printPlayerStatus(result);
			});
		});
	});

program
	.command('position [newPosition]')
	.alias('pos')
	.description('Get or set player position [mm:ss], e.g: pos 1:23')
	.action((newPosition) => {
		if(newPosition){
			spotifyClient.setPosition(newPosition).then(() => {
				spotifyClient.status().then((result) => {
					printer.printPlayerStatus(result);
				});
			});
		}
		else {
			spotifyClient.getPosition().then(() => {
				spotifyClient.status().then((result) => {
					printer.printPlayerStatus(result);
				});
			});
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
			printer.printToggleShuffle(status);
		});
	});

program
	.command('repeat')
	.alias('tr')
	.description('Toggle repeat on/off')
	.action(() => {
		spotifyClient.repeat().then((status) => {
			printer.printToggleRepeat(status);
		});
	});

program
	.command('share [type]')
	.alias('sh')
	.description('Display share <uri|url> and copy value to clipboard')
	.action((type) => {
		spotifyClient.share(type);
	});

program
	.command('token')
	.alias('tk')
	.description('Change Client Spotify tokens')
	.action(() => {
		setTokens();
	});

program
	.command('lyrics')
	.alias('ly')
	.description('Display the lyrics of currently playing track')
	.action(() => {
		spotifyClient.status().then((trackInfo) => {
			if(!GENIUS_API_KEY_SET){
				console.log('You need to set the Client Access Token for Genius API.');
				console.log('Sign up for API access here: https://genius.com/api-clients');
				console.log('Update config.json file with your credentials');
				return;
			}
			fetchLyrics(lyricist, trackInfo.artist, trackInfo.track);
		});
	});

program
		.command('recommend')
		.alias('rec')
		.description('Recommend other songs based on the song currently playing.')
		.action(() => {
			spotifyApi.clientCredentialsGrant()
				.then(function(data) {
					spotifyApi.setAccessToken(data.body['access_token']);
					spotifyClient.getCurrentSongId().then((data) => {
						spotifyApi.getRecommendations({ seed_tracks: [data] }).then((response) => {
							// Assuming Spotify won't start recommending albums, artists, or playlists
							var results = parseSearchResults('tracks', response);
							printer.printSearchResults('tracks', results);
							prompt.start();
							prompt.get(['selection'], function (err, result) {
								if (err) {
									return process.stdout.write('\n');
								}
								if(results[result.selection-1]){
									var selectedSpotifyURI = results[result.selection-1].spotifyURI;
									spotifyClient.play(selectedSpotifyURI).then(() => {
										spotifyClient.status().then((result) => {
											printer.printPlayerStatus(result);
										});
									});
								}
							});
						});
					});
				}, function(err) {
					console.log('Something went wrong when retrieving an access token', err);
				});
		});

program.parse(process.argv);

/* CHECK Installed CLI version
 * */
let publishedVersion = require('child_process').execSync(`npm info spotify-cli-mac version`);
publishedVersion = publishedVersion.toString().trim().replace(/^\n*/, '').replace(/\n*$/, '');
if(semver.lt(version, semver.clean(publishedVersion))){
	console.log(`Your Spotify CLI is outdated. Latest version is ${publishedVersion}, you're on ${version}`);
	console.log(`Reinstall by doing:`);
	console.log(`npm uninstall -g spotify-cli-mac`);
	console.log(`npm install spotify-cli-mac -g\n`);
}

