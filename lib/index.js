'use strict';

const fs = require('fs-extra');
const path = require('path');
const _ = require('lodash');
const minimist = require('minimist');
const ffmpeg = require('fluent-ffmpeg');
const {downloadVideo, searchVideos, getStreamServer} = require('./utils');
const {YOUTUBE_API_KEY, CLIENT_ID, STREAM_KEY} = require('../config');

const downloadedVideosPath = path.resolve(__dirname, '../tmp/downloaded-videos');
const processedVideosPath = path.resolve(__dirname, '../tmp/processed-videos');
const playlistFile = path.resolve(processedVideosPath, 'playlist1.txt');
const playlistFile2 = path.resolve(processedVideosPath, 'playlist2.txt');

/**
 * Делает из исходного одномерного массива двумерный,
 * элементы результирующего массива - массивы длиной 5
 * Пример: вход - [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], выход - [[ 1, 2, 3, 4, 5], [6, 7, 8, 9, 10], [11, 12]]
 *
 * @param {Array<*>} arr - массив
 * @returns {Array<Array<*>>}
 */
const splitArray = (arr) => {
	const innerArraysCount = Math.ceil(arr.length / 5);

	return _.range(innerArraysCount).map((groupIndex) => {
		return arr.slice(groupIndex * 5, (groupIndex + 1) * 5);
	});
};

/**
 * Ищем видео на youtube на основании переданных аргументов,
 * далее скачиваем их, одновременно запускаем максимум 5 скачиваний
 *
 * @returns {Promise<*>}
 */
const downloadVideos = ({count, duration, query}) => {
	return searchVideos({
		searchQuery: query,
		youtubeKey: YOUTUBE_API_KEY,
		maxResultsCount: count,
		duration
	}).then((videosUrls) => splitArray(videosUrls)
		.reduce((promise, urlArray, urlArrayId) => promise
			.then((resultVideosPaths) => Promise.all(
				[
					...resultVideosPaths,
					...urlArray.map((url, id) => {
						const outputName = `video${urlArrayId * 5 + id}.mp4`;
						const outputPath = path.resolve(downloadedVideosPath, outputName);

						return downloadVideo({url, outputPath}).then(() => outputPath);
					})
				]
			)), Promise.resolve([])
		)
	);
};

/**
 * Подготавливает видео
 *
 * @param {String} videoPath Путь до видео
 * @param {String} output Куда сохраняем
 * @returns {Promise}
 */
const processVideo = (videoPath, output) => {
	return new Promise((resolve) => {
		ffmpeg(videoPath)
			.videoCodec('libx264')
			.fps(60)
			.size('1920x1080')
			.output(output)
			.format('flv')
			.on('end', resolve)
			.run();
	});
};

/**
 * Подготавливает скачанные видео для стрима
 *
 * @param {Array<String>} videosPaths Пути до скачанных видео
 * @returns {Promise<*>}
 */
const processVideos = (videosPaths) => {
	fs.outputFile(playlistFile2, 'ffconcat version 1.0\nfile \'playlist1.txt\'');
	const ws = fs.createWriteStream(playlistFile);
	ws.write('ffconcat version 1.0\n');

	return videosPaths.reduce((result, videoPath) => {
		const outputFileName = path.basename(videoPath).replace('.mp4', '.flv');
		const output = path.resolve(processedVideosPath, outputFileName);
		return result.then(() => processVideo(videoPath, output).then(() => ws.write(`file '${outputFileName}'\n`)));
	}, Promise.resolve()).then(() => ws.write('file \'playlist2.txt\''));
};

/**
 * Запускает стрим
 *
 * @param {String} output Куда стримим
 */
const startStream = (output) => {
	ffmpeg(playlistFile)
		.native()
		.inputFormat('concat')
		.audioCodec('copy')
		.videoCodec('copy')
		.format('flv')
		.output(output)
		.run();
};

/**
 * Скачивает видео и запускает стрим
 */
const run = () => {
	const {count, duration, query} = minimist(process.argv.slice(2));

	downloadVideos({count, duration, query})
		.then(processVideos)
		.then(() => getStreamServer(CLIENT_ID))
		.then((server) => startStream(server.url_template.replace('{stream_key}', STREAM_KEY)));
};

run();
