const { omit, isEmpty } = require('lodash');
const { hashPassword } = require('../utils/password');
const { CustomError } = require('../defines/errors');
const { DBResponse } = require('../defines/responses');
const conn = require('./connection');

const COMMON_FIELDS = ['username', 'password', 'display_name', 'email', 'birthday', 'gender'];
const FIELDS = [...COMMON_FIELDS, 'google_id', 'facebook_id'];

const findOne = async conditions => {
	const result = new DBResponse(null, null);

	if (isEmpty(omit(conditions, FIELDS))) {
		await conn('user')
			.where(conditions)
			.select()
			.then(users => users.length > 0 && (result.data = Object.assign({}, users[0])))
			.catch(err => result.error = new CustomError(500, err));
	} else {
		result.error = new CustomError(400, 'Bad request');
	}

	return result;
}

const addNew = async dataObj => {
	const result = new DBResponse(null, null);

	try {
		if (isEmpty(omit(dataObj, COMMON_FIELDS))) {
			const newData = {
				...dataObj,
				password: dataObj.password ? hashPassword(dataObj.password) : null
			};

			await conn('user')
				.insert(newData)
				.then(res => result.error = null)
				.catch(err => result.error = new CustomError(500, err));
		} else {
			result.error = new CustomError(400, 'Bad Request');
		}
	} catch (err) { console.log(err) };

	return result;
}

module.exports = {
	findOne,
	addNew
}