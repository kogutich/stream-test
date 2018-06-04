'use strict';

const axios = require('axios');

/**
 * Возвращает twitch сервер
 * Пытается отдать дефолтный сервер, если не находит - отдает рандомный из всех доступных
 *
 * @param {String} clientId Идентификатор клиента
 * @returns {Promise<*>}
 */
const getStreamServer = (clientId) => {
	return axios({
		url: 'https://api.twitch.tv/kraken/ingests',
		headers: {
			'Accept': 'application/vnd.twitchtv.v5+json',
			'Client-ID': clientId
		}
	}).then(({data: {ingests}}) => {
		if (!ingests || !ingests.length) {
			throw new Error('Get stream server error');
		}

		const defaultServer = ingests.find((ingest) => ingest.default);
		return defaultServer || ingests[Math.floor(Math.random() * ingests.length)];
	}).catch((err) => {
		throw new Error(`Get stream server error: ${err}`);
	});
};

module.exports = getStreamServer;
