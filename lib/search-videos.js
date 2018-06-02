'use strict';

const axios = require('axios');
const _ = require('lodash');

// ютуб не отдает больше 50 видео за запрос
const maxPossibleResults = 50;

/**
 * Осуществляет поиск и возвращает список ссылок на видео из youtube
 *
 * @param {String} searchQuery Строка запроса видео
 * @param {String} youtubeKey Ключ для использования API YouTube
 * @param {Number} maxResultsCount Максимальное количество ссылок, которое хотим получить
 * @param {String} [pageToken] Токен страницы при поиске
 * @returns {Promise<*>}
 */
const searchVideos = ({searchQuery, youtubeKey, maxResultsCount, pageToken}) => {
	return axios.get('https://www.googleapis.com/youtube/v3/search', {
		params: {
			part: 'snippet',
			key: youtubeKey,
			q: searchQuery,
			videoDuration: 'short',
			type: 'video',
			maxResults: maxPossibleResults,
			pageToken
		}
	}).then(({data: {items, nextPageToken}}) => {
		const videosUrls = items.reduce((result, {id: {videoId}, snippet: {liveBroadcastContent}}) => {
			return liveBroadcastContent === 'none' && videoId
				? [...result, `https://www.youtube.com/watch?v=${videoId}`]
				: result;
		}, []);

		const newMaxResultsCount = maxResultsCount - videosUrls.length;

		if (newMaxResultsCount < 0) {
			return _.take(videosUrls, maxResultsCount);
		}

		if (newMaxResultsCount === 0 || !nextPageToken) {
			return videosUrls;
		}

		return searchVideos({
			searchQuery,
			youtubeKey,
			maxResultsCount: newMaxResultsCount,
			pageToken: nextPageToken
		}).then((result) => [...videosUrls, ...result]);
	});
};

module.exports = searchVideos;
