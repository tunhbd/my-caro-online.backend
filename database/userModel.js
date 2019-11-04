const { omit, isEmpty } = require('lodash');
const { hashPassword } = require('../utils/password');
const { CustomError } = require('../defines/errors');
const { DBResponse } = require('../defines/responses');
const {
	USER_FIELDS,
	NEW_USER_FIELDS,
	UPDATABLE_USER_FIELDS
} = require('../defines/constants');
const conn = require('./connection');

const findOne = conditions => new Promise((resolve, reject) => {
	if (isEmpty(omit(conditions, USER_FIELDS))) {
		conn('user')
			.where(conditions)
			.select()
			.then(users => resolve(users[0]))
			.catch(err => reject(err));
	} else {
		reject(new CustomError(400, 'Bad request'));
	}
});

const addNew = dataObj => new Promise((resolve, reject) => {
	if (isEmpty(omit(dataObj, USER_FIELDS))) {
		const newData = {
			...dataObj,
			password: dataObj.password ? hashPassword(dataObj.password) : null
		};

		conn('user')
			.insert(newData)
			.then(() => {
				findOne({ username: dataObj.username })
					.then(user => resolve(user))
					.catch(err => reject(err));
			})
			.catch(err => reject(err));
	} else {
		reject(new CustomError(400, 'Bad Request'));
	}
});

const updateOne = (conditionsKey, dataObj) => new Promise((resolve, reject) => {
	if (isEmpty(omit(dataObj, UPDATABLE_USER_FIELDS))) {
		conn('user')
			.where(conditionsKey)
			.update(dataObj)
			.then(() => {
				findOne(conditionsKey)
					.then(user => resolve(user))
					.catch(err => reject(err));
			})
			.catch(err => reject(err));
	} else {
		reject(new CustomError(400, 'Bad request'));
	}
});

module.exports = {
	findOne,
	addNew,
	updateOne
}