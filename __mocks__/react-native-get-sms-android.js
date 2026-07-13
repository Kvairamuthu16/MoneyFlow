// Manual Jest mock: no real SMS inbox is available under Jest.
module.exports = {
  list: (_filter, _onFail, onSuccess) => onSuccess(0, '[]')
};
