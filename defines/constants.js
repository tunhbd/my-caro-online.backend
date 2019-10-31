const NEED_TO_REMOVE_FIELDS_TOKEN = [
  'avatar',
  'gender',
  'email',
  'birthday',
  'display_name',
  'password',
  'avatar_id'
];

const NOT_NEED_FIELDS_PROFILE = [
  'avatar_id',
  'google_id',
  'facebook_id',
  'password'
]

const USER_FIELDS = [
  'username',
  'password',
  'email',
  'gender',
  'birthday',
  'display_name',
  'avatar',
  'avatar_id',
  'facebook_id',
  'google_id'
];

const NEW_USER_FIELDS = [
  'username',
  'password',
  'display_name',
  'email',
  'birthday',
  'gender'
];

const UPDATE_USER_FIELDS = [
  'display_name',
  'email',
  'birthday',
  'gender'
];

module.exports = {
  NEED_TO_REMOVE_FIELDS_TOKEN,
  USER_FIELDS,
  NEW_USER_FIELDS,
  UPDATE_USER_FIELDS,
  NOT_NEED_FIELDS_PROFILE
}