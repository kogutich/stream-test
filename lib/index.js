'use strict';

const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const {getServer} = require('./get-stream-server');
const {STREAM_KEY, CLIENT_ID} = require('../config');

const videosPath = path.resolve(__dirname, '../videos');

getServer(CLIENT_ID).then((server) => {
	ffmpeg(`${videosPath}/video1.mp4`)
		.fps(60)
		.size('1920x1080')
		.output(server.url_template.replace('{stream_key}', STREAM_KEY))
		.format('flv')
		.run();
});
