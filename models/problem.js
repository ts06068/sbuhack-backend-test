const mongoose = require("mongoose");

const Schema = mongoose.Schema;

/*
Problem has:
    _id
    userId
    quizId
    questionTextPhoto
    questionImagePhoto
    questionTextPhotoTranslatedText
    answerExplanationText
    answerNarrationVoice
    answerVideo
    title
    category
    isForKids
    isSaved
    lastUpdated
*/

const ProblemSchema = new Schema({
  agent: { type: Schema.Types.ObjectId, ref: "User" },
  quizId: { type: Schema.Types.ObjectId, ref: "Quiz" },
  questionTextPhoto: { type: String },
  questionImagePhoto: { type: String },
  questionTextPhotoTranslatedText: { type: String },
  answerExplanationText: { type: String },
  answerNarrationVoice: { type: String },
  answerVideo: { type: String },
  title: { type: String },
  category: { type: String },
  isForKids: { type: Boolean },
  isSaved: { type: Boolean, default: false },
  lastUpdated: { type: Date },
});

const Problem = mongoose.model("Problem", ProblemSchema);

module.exports = Problem;
