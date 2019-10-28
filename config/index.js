module.exports = {
	PASSPORT: {
		JWT: {
			SECRET: 'NguyenHuuTu-1612772'
		},
		FACEBOOK: {
			CLIENT_ID: '650118635518017',
			CLIENT_SECRET: 'c048e4109fcb63d0fe602d0976d6fef9',
			CALLBACK_URL: 'https://my-caro-online-api.herokuapp.com/user/facebook/callback'
		},
		GOOGLE: {
			CLIENT_ID: '813535094121-q30ebqjs5cblqim8vilslkudsghjh3rf.apps.googleusercontent.com',
			CLIENT_SECRET: 'ls6UXWvxJ4KIrtPRLNihxM2U',
			CALLBACK_URL: '/user/google/callback'
		}
	},
	SERVER: {
		PORT: 3001
	},
	DATABASE: {
		CLIENT: 'mysql',
		HOST: 'remotemysql.com',
		USER: '6gGmOx0ZoP',
		PASS: 'aLHFl9gKdj',
		DATABASE_NAME: '6gGmOx0ZoP'
	}
}