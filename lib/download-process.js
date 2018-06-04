'use strict';

const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const minimist = require('minimist');
const {downloadVideo, searchVideos} = require('./utils');
const {YOUTUBE_API_KEY} = require('../config');

const downloadedVideosList = path.resolve(__dirname, '../tmp/download.txt');
const downloadedVideosPath = path.resolve(__dirname, '../tmp/downloaded-videos');

const {count: maxResultsCount, duration, query: searchQuery} = minimist(process.argv.slice(2));

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
 */
const run = () => {
	searchVideos({
		searchQuery,
		youtubeKey: YOUTUBE_API_KEY,
		maxResultsCount,
		duration
	}).then((videosUrls) => {
		const ws = fs.createWriteStream(downloadedVideosList);

		return splitArray(videosUrls).reduce((promise, urlArray, urlArrayId) => {
			return promise.then(() => Promise.all(
				urlArray.map((url, id) => {
					const outputName = `video${urlArrayId * 5 + id}.mp4`;
					const outputPath = path.resolve(downloadedVideosPath, outputName);

					return downloadVideo({url, outputPath})
						.then(() => outputPath);
				})
			).then((outputPaths) => {
				outputPaths.forEach((path) => ws.write(`${path}\n`));
			}));
		}, Promise.resolve());
	});
};

run();
