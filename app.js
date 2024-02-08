const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const usersRouter = require("./routes/usersRoute");
const problemsRouter = require("./routes/problemsRoute");
const quizzesRouter = require("./routes/quizzesRoute");

const session = require("express-session");
const MongoStore = require("connect-mongo");

require("dotenv").config();

const multer = require("multer");
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
const upload = multer({ dest: "uploads/", storage: storage });

const { default: OpenAI } = require("openai");
const cloudinary = require("cloudinary").v2;

const app = express();
const PORT = process.env.PORT || 5000;
const openai = new OpenAI();

const cloudName = "dwp6hrsi5";
const apiKey = "551172172875792";
const apiSecret = "NY_dwkBohvCJ3aIpw7bbzsMCIDo";
const uploadPreset = "jpxjict6";

app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:3000", "https://sbuhack-backend.onrender.com"],
    credentials: true,
  })
);

// Cloudinary configuration
cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

// 789*576 image size

const uri = process.env.ATLAS_URI;

// Connect to MongoDB
mongoose.connect(uri);
const connection = mongoose.connection;
connection.once("open", () => {
  console.log("MongoDB database connection established successfully");
});

const sessionSecret = "make a secret string";

const store = MongoStore.create({
  mongoUrl: uri,
  secret: sessionSecret,
  touchAfter: 24 * 3600,
});

const sessionConfig = {
  store,
  name: "session",
  secret: sessionSecret,
  resave: false,
  saveUninitialized: true,
  cookie: {
    path: "/",
    httpOnly: true,
    expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
};

app.use((req, res, next) => {
  req.requestTime = Date.now();
  next();
});

app.use((err, req, res, next) => {
  console.log("Error handling called ", err);
  res.statusMessage = err.message;

  if (err.name === "ValidationError") {
    res.status(400).end();
  } else if (err.name === "MongoServerError") {
    //unable to manipulate mongoDB
    res.status(501).end();
  } else {
    res.status(500).end();
  }
});

app.use(session(sessionConfig));

app.use("/api", usersRouter);
app.use("/api", problemsRouter);
app.use("/api", quizzesRouter);

/*  ENDPOINTS  */

//GET

// /test endpoint: sends a message to the client
app.get("/test", async (req, res) => {
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant.",
      },
      {
        role: "user",
        content: "What is the meaning of life?",
      },
    ],
  });

  const answer = completion.choices.map((choice) => choice.message.content);

  res.json({ answer });
});

/* POST */

app.post("/questions-alt", async (req, res) => {
  //receive question and image value as form-data type
  const question = req.body.question;
  let imageUrl = req.body.imageUrl;

  // configure openai
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant.",
      },
      {
        role: "user",
        content: question,
      },
    ],
  });

  // retrieve answer from openai
  const answer = completion.choices.map((choice) => choice.message.content);

  console.log(answer);

  const data = new FormData();
  data.append("file", imageUrl);
  data.append("upload_preset", uploadPreset);

  // send answer and image url back to client
  res.json({ answer, imageUrl });

  /*
  On client-side, please use this handler:
    const handleFileChangeAlt = async (e) => {
    const file = e.target.files[0];

    const uploadPreset = "jpxjict6"; // Add your upload preset
    const data = new FormData();
    data.append("file", file);
    data.append("upload_preset", uploadPreset);

    // upload image to cloudinary using cloudinary API
    const response = await axios
      .post("https://api.cloudinary.com/v1_1/dwp6hrsi5/image/upload", data)
      .catch((error) => {
        alert(error.message);
      });

    // send POST request to server
    const imageUrl = response.data.url;
    const question = "What is the name of this tree?";
    const serverResponse = await axios
      .post("https://sbuhack-backend.onrender.com/questions-alt", {
        question,
        imageUrl,
      })
      .catch((error) => {
        alert(error.message);
      });

    console.log(serverResponse);
  };
   */
});

module.exports = app;
