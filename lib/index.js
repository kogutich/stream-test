'use strict';

const path = require('path');
const glob = require('glob');
const fs = require('fs-extra');
const ffmpeg = require('fluent-ffmpeg');

const {getServer} = require('./get-stream-server');
const {STREAM_KEY, CLIENT_ID} = require('../config');
const SEARCH_DELAY = 3000;
const videosPath = path.resolve(__dirname, '../videos');

/**
 * Подготавливает и загружает видео
 *
 * @param {String} videoPath Путь до видео
 * @param {String} output Куда загружаем
 * @returns {Object}
 */
const uploadVideo = (videoPath, output) => {
	return new Promise((resolve) => {
		ffmpeg(videoPath)
			.videoCodec('libx264')
			.fps(60)
			.size('1920x1080')
			.output(output)
			.format('flv')
			.on('end', () => {
				fs.removeSync(videoPath);
				resolve();
			})
			.run();
	});
};

/**
 * Запускает стрим
 *
 * @param {String} server Сервер twitch
 * @param {String} output Куда загружаем видео
 */
const stream = (server, output) => {
	const videosPaths = glob.sync(`${videosPath}/*.@(mp4|avi|flv)`);

	if (!videosPaths.length) {
		setTimeout(stream, SEARCH_DELAY, server, output);
		return;
	}

	videosPaths.reduce((result, path) => {
		return result.then(() => uploadVideo(path, output));
	}, Promise.resolve()).then(() => stream(server, output));
};

// Получаем сервер и запускаем стрим
getServer(CLIENT_ID).then((server) => stream(server, server.url_template.replace('{stream_key}', STREAM_KEY)));
// getServer(CLIENT_ID).then((server) => stream(server, `output/${Math.random()}.flv`));
