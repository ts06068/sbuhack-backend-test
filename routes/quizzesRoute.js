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
            "You are a instructor who gives students a quiz. I will give you an explanation. You make a new question from my explanation so that the answer should be one word. Just say exactly the question you made so that I can just copy it.", // content will change by isForKids
        },
        {
          role: "user",
          content: problem.questionTextPhotoTranslatedText,
        },
      ],
    });

    const paraphrasedQuestion = completion.choices
      .map((choice) => choice.message.content)
      .pop();

    const completionAfter = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a instructor who gives students a quiz. I will give you an explanation. You make a new question from my explanation so that the answer should be one word. Just say exactly the question you made so that I can just copy it.", // content will change by isForKids
        },
        {
          role: "user",
          content: problem.questionTextPhotoTranslatedText,
        },
        {
          role: "assistant",
          content: paraphrasedQuestion,
        },
        {
          role: "user",
          content:
            "Based on the question you made, what is the answer? Just write the answer so that I can just copy it.",
        },
      ],
    });

    // using _id, get the problem and get questionImagePhoto
    const questionImagePhoto = problem.questionImagePhoto;
    const answerVideo = problem.answerVideo;

    const answer = completionAfter.choices
      .map((choice) => choice.message.content)
      .pop();

    const userInputAnswer = "";
    const isCorrect = false;
    const lastUpdated = new Date();

    const quiz = new Quiz({
      agent: uid,
      problemId: _id,
      question: paraphrasedQuestion,
      questionImagePhoto,
      answerVideo,
      answer,
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

    const realAnswer = quiz.answer;

    const isCorrect =
      userInputAnswer.toLowerCase() === realAnswer.toLowerCase();

    const updatedQuiz = await Quiz.findByIdAndUpdate(
      _id,
      { userInputAnswer, isCorrect, lastUpdated },
      { new: true }
    );

    res.json(updatedQuiz);
  })
);

module.exports = router;
