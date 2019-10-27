class DBResponse {
  constructor(_error, _data) {
    this.error = _error;
    this.data = _data;
  }
}

module.exports = {
  DBResponse
}