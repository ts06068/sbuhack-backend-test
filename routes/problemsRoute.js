const express = require("express");
const router = express.Router();

const Problem = require("../models/problem");
const User = require("../models/user");

const wrapAsync = require("../utils/helper");
const { isLoggedIn } = require("../middleware/auth");

const { default: OpenAI } = require("openai");

const openai = new OpenAI();
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const { createWorker } = require("tesseract.js");

const {
  startVideoGeneration,
  fetchVideoResult,
} = require("../utils/generateVideo");

require("dotenv").config();

cloudinary.config({
  secure: true,
});

console.log(cloudinary.config());

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
POST /question: user takes picture of text and image from the book, and uploads a question.
body: questionTextPhoto, questionImagePhoto, isForKids
server process: upload Problem to DB
res: uploaded all fields of Problem (From DB)
*/

/*
router.post(
  "/video",
  wrapAsync(async (req, res) => {
    const body = req.body;

    const generationID = await startVideoGeneration(
      "https://res.cloudinary.com/dwp6hrsi5/image/upload/h_1024,w_576/esb3sfgvphgxynkyrs1i.jpg"
    );

    let generationResult = false;

    const timerId = setInterval(async () => {
      console.log("Checking for video generation result");
      generationResult = await fetchVideoResult(generationID);
      console.log("Generation result:", generationResult);
      if (generationResult) {
        console.log("Video generation result found");

        // Upload the video to Cloudinary
        let cld_upload_stream = cloudinary.uploader.upload_stream(
          { folder: "video", resource_type: "auto" },
          function (error, result) {
            res.json(result);
          }
        );
        clearInterval(timerId);
        streamifier.createReadStream(generationResult).pipe(cld_upload_stream);
      }
    }, 10000);
  })
);

router.post(
  "/narrate",
  wrapAsync(async (req, res) => {
    const body = req.body;
    const { text } = body;

    const audio = await openai.audio.speech.create({
      model: "tts-1",
      voice: "echo",
      input: "Hello world",
    });

    const buffer = Buffer.from(await audio.arrayBuffer());

    let cld_upload_stream = cloudinary.uploader.upload_stream(
      { folder: "audio", resource_type: "auto" },
      function (error, result) {
        res.json(result);
      }
    );

    streamifier.createReadStream(buffer).pipe(cld_upload_stream);
  })
);

router.post(
  "/extract",
  wrapAsync(async (req, res) => {
    const body = req.body;
    const { imageUrl } = body;

    (async () => {
      const worker = await createWorker("eng");
      const ret = await worker.recognize(
        "https://tesseract.projectnaptha.com/img/eng_bw.png"
      );
      console.log(ret.data.text);
      await worker.terminate();
    })();

    res.json({ message: "SUCCESS" });
  })
);
*/

router.post(
  "/question",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    const uid = req.session.userId;
    const body = req.body;
    let {
      questionTextPhotoTranslatedText,
      questionTextPhoto,
      questionImagePhoto,
      isForKids,
    } = body; // questionImagePhoto should have size of 1024x576

    /*
    const revision = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant", // content will change by isForKids
        },
        {
          role: "user",
          content: `This is a scanned text from a book: ${questionTextPhotoTranslatedText}. Guess the context based on the scanned word, then explain them in 3 sentences easily. Do not include in answer that you are not sure about context but say only about context you guessed confidently.`,
        },
      ],
    });
    */

    console.log("questionTextPhoto:", questionTextPhoto);
    console.log("questionImagePhoto:", questionImagePhoto);

    // extract text from questionTextPhoto using openai
    const revision = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "There are some text in the image. Read every text you see in the image and exactly write it as a paragraph.",
            },
            {
              type: "image_url",
              image_url: {
                url: questionTextPhoto,
              },
            },
          ],
        },
      ],
    });

    questionTextPhotoTranslatedText = revision.choices
      .map((choice) => choice.message.content)
      .pop();

    let answerNarrationVoice = "narration voice"; // narration voice of answerExplanationText generated by openai **DEPRECATED**
    let answerVideo = "video"; // video of answerExplanationText generated by openai
    const title = "title";
    const category = "none";
    const isSaved = false;
    const lastUpdated = new Date();

    // make answerExplanationText from questionTextPhotoTranslatedText
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant", // content will change by isForKids
        },
        {
          role: "user",
          content: `Summarize the text in 2 sentences: ${questionTextPhotoTranslatedText}`,
        },
      ],
    });

    const answerExplanationText = completion.choices
      .map((choice) => choice.message.content)
      .pop();

    // make narration voice from answerExplanationText
    const audio = await openai.audio.speech.create({
      model: "tts-1",
      voice: isForKids ? "nova" : "onyx",
      input: answerExplanationText,
    });

    const narrationVoiceBuffer = Buffer.from(await audio.arrayBuffer());

    let cld_upload_stream = cloudinary.uploader.upload_stream(
      { folder: "audio", resource_type: "auto" },
      async function (error, result) {
        answerNarrationVoice = result.url;

        // make video from questionImagePhoto
        const generationID = await startVideoGeneration(
          questionImagePhoto,
          isForKids
        );

        let generationResult = false;

        const timerId = setInterval(async () => {
          console.log("Checking for video generation result");
          generationResult = await fetchVideoResult(generationID);
          console.log("Generation result:", generationResult);
          if (generationResult) {
            console.log("Video generation result found");

            // Upload the video to Cloudinary and save the problem to DB
            let cld_upload_stream = cloudinary.uploader.upload_stream(
              { folder: "video", resource_type: "auto" },
              async function (error, result) {
                answerVideo = result.url;

                const newProblem = new Problem({
                  agent: uid,
                  questionTextPhoto,
                  questionImagePhoto,
                  questionTextPhotoTranslatedText,
                  answerExplanationText,
                  answerNarrationVoice,
                  answerVideo,
                  title,
                  category,
                  isForKids,
                  isSaved,
                  lastUpdated,
                });

                const savedProblem = await newProblem.save();

                res.json(savedProblem);
              }
            );
            clearInterval(timerId);
            streamifier
              .createReadStream(generationResult)
              .pipe(cld_upload_stream);
          }
        }, 10000);
      }
    );

    streamifier.createReadStream(narrationVoiceBuffer).pipe(cld_upload_stream);
  })
);

/*
POST /problem: user likes the answer from the problem he uploaded, and adds it to favoriteProblems of User
body: _id of Problem, title, category, isForKids
server process: append _id of the new Problem to favoriteProblems of User
res: 200 (SUCCESS) 400/500 (FAILURE)
*/

router.put(
  "/question",
  isLoggedIn,
  wrapAsync(async (req, res) => {
    const uid = req.session.userId;
    const body = req.body;
    const { _id, title, category, isForKids } = body;
    const lastUpdated = new Date();

    //update the problem first. Update the title and category
    const problem = await Problem.findByIdAndUpdate(
      _id,
      { title, category, lastUpdated },
      { new: true }
    );

    if (!problem) {
      return res.status(400).json({ message: "Problem not found" });
    }

    //find the user and update the favoriteProblems
    const user = await User.findById(uid);

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    user.favoriteProblems.push(_id);
    await user.save();

    res.json({ message: "SUCCESS" });
  })
);

/*
GET /problem: user finds saved problems by category
body: category, isForKids
server process: find all problems in the category from DB
res: [_id of Problem...]
*/

router.put(
  "/favoriteProblems",
  wrapAsync(async (req, res) => {
    const uid = req.session.userId;
    const body = req.body;
    console.log(req.body);
    const { category, isForKids } = body;

    let problems;

    if (category === "all") {
      problems = await Problem.find({ isForKids });
    } else {
      problems = await Problem.find({ category, isForKids });
    }

    if (!problems) {
      return res.status(400).json({ message: "Problem not found" });
    }

    res.json(problems);
  })
);

module.exports = router;
