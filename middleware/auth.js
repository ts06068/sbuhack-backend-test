const Quiz = require("../models/quiz");

const User = require("../models/user");
const wrapAsync = require("../utils/helper");

module.exports.isLoggedIn = (req, res, next) => {
  if (!req.session.userId) {
    throw new Error("You must be logged in");
  }
  next();
};

module.exports.isAgentOfQuiz = wrapAsync(async (req, res, next) => {
  const uid = req.session.userId;
  const body = req.body;
  const { _id, userInputAnswer } = body;

  const quiz = await Quiz.findById(_id);

  if (!quiz) {
    throw new Error("Quiz not found");
  }

  if (!quiz.agent.equals(uid)) {
    throw new Error("You are not the agent of this quiz");
  }

  next();
});
