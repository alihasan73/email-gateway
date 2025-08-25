const userModel = require("./user.model");
const tableModel = require("./table");
const tokenModel = require("./token.model");

async function init() {
  try {
    await Promise.all([
      userModel.userModel(),
      tokenModel.tokenModel(),
    ]);
    return true;
  } catch (err) {
    console.error('models.init error:', err && err.message ? err.message : err);
    return false;
  }
}

module.exports = {
  userModel,
  tableModel,
  tokenModel,
  init,
  // Add other models here
};