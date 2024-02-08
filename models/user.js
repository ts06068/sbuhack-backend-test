const mongoose = require("mongoose");

const Schema = mongoose.Schema;

/*
User has:
  _id
  userName
  favoriteProblems: [_id of Problem...] (ref: Problem)
*/

const UserSchema = new Schema({
  userName: { type: String, required: true },
  favoriteProblems: [{ type: Schema.Types.ObjectId, ref: "Problem" }],
});

UserSchema.statics.findAndValidate = async function (userName) {
  const user = await this.findOne({ userName });
  if (!user) {
    return false;
  }

  const isValid = user.userName === userName;
  return isValid ? user : false;
};

UserSchema.pre("save", async function (next) {
  if (!this.isModified("userName")) {
    return next();
  }
  next();
});

const User = mongoose.model("User", UserSchema);

module.exports = User;
