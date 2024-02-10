const mongoose = require("mongoose");

const Schema = mongoose.Schema;

/*
Quiz has:
    _id
    userId
    problemId
    question
    answer
    userInputAnswer
    isCorrect
    lastUpdated
*/

const QuizSchema = new Schema({
  agent: { type: Schema.Types.ObjectId, ref: "User" },
  problemId: { type: Schema.Types.ObjectId, ref: "Problem" },
  question: { type: String },
  answer: { type: String },
  userInputAnswer: { type: String },
  isCorrect: { type: Boolean },
  lastUpdated: { type: Date },
  questionImagePhoto: { type: String },
});

const Quiz = mongoose.model("Quiz", QuizSchema);

module.exports = Quiz;
