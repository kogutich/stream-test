'use strict';

const fs = require('fs');
const ytdl = require('ytdl-core');

/**
 * Скачивает видео в формате mp4 с youtube
 *
 * @param {String} url Ссылка на видео
 * @param {String} outputPath Путь куда скачиваем
 * @returns {Promise<*>}
 */
const downloadVideo = ({url, outputPath}) => new Promise((resolve) => {
	const ws = fs.createWriteStream(outputPath);
	ytdl(url, {filter: ({container}) => container === 'mp4'})
		.pipe(ws)
		.on('finish', () => {
			ws.close();
			resolve();
		});
});

module.exports = downloadVideo;
