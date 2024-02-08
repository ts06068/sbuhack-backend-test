const express = require("express");
const router = express.Router();

const Problem = require("../models/problem");
const Quiz = require("../models/quiz");

const wrapAsync = require("../utils/helper");
const { isLoggedIn, isAgentOfQuiz } = require("../middleware/auth");

const { default: OpenAI } = require("openai");
const openai = new OpenAI();

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

/*
GET /quiz: user clicks on a saved problem and a quiz is created by openai, saves it to DB and then the user takes a quiz on it
body: _id of Problem
server process: using questionTextPhotoTranslatedText and answerExplanationText, generate a quiz and save it to DB
res: Quiz
*/

router.post(
  "/quiz",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    const uid = req.session.userId;
    const body = req.body;
    const { _id } = body;

    const problem = await Problem.findById(_id)
      .populate("agent")
      .populate("quizId");

    // make a new question given questionTextPhotoTranslatedText using openai
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a instructor who gives students a quiz. I will give you a sample question. You make a new question by paraphrasing it. Submit to me your new question and the answer in this format so that I can parse the string: <QuestionText>:<AnswerText>", // content will change by isForKids
        },
        {
          role: "user",
          content: problem.questionTextPhotoTranslatedText,
        },
      ],
    });

    //TODO: make new question and a one-word answer

    const paraphrasedQuestion = completion.choices
      .map((choice) => choice.message.content)
      .pop();

    const userInputAnswer = "";
    const isCorrect = false;
    const lastUpdated = new Date();

    const quiz = new Quiz({
      agent: uid,
      problemId: _id,
      question: paraphrasedQuestion,
      answer: problem.answerExplanationText,
      userInputAnswer,
      isCorrect,
      lastUpdated,
    });

    const savedQuiz = await quiz.save();

    res.json(savedQuiz);
  })
);

/*
PUT /quiz: take the quiz
body: _id of Quiz, userInputAnswer
server process: compares user's answer from the real answer and update isCorrect, lastUpdated of Quiz
*/

router.put(
  "/quiz",
  isAgentOfQuiz,
  wrapAsync(async (req, res) => {
    const uid = req.session.userId;
    const body = req.body;
    const { _id, userInputAnswer } = body;
    const lastUpdated = new Date();

    const quiz = await Quiz.findById(_id);

    const isCorrect = quiz.answer === userInputAnswer;

    const updatedQuiz = await Quiz.findByIdAndUpdate(
      _id,
      { userInputAnswer, isCorrect, lastUpdated },
      { new: true }
    );

    res.json(updatedQuiz);
  })
);

module.exports = router;
