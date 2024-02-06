const express = require("express");
//const mongoose = require("mongoose");
const cors = require("cors");

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
const PORT = process.env.PORT || 3001;
const openai = new OpenAI();

const cloudName = "dwp6hrsi5";
const apiKey = "551172172875792";
const apiSecret = "NY_dwkBohvCJ3aIpw7bbzsMCIDo";
const uploadPreset = "jpxjict6";

// Cloudinary configuration
cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

app.use(express.json());
app.use(cors());
app.use(express.static("uploads"));

// Connect to MongoDB
/*
mongoose.connect(
  "mongodb+srv://biniam:Ethiopia@cluster0.hrahgto.mongodb.net/?retryWrites=true&w=majority"
);
*/

// User schema
/*
const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  userName: { type: String, required: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  date: { type: Date, default: Date.now },
});
// User model
const UserModel = mongoose.model("User", userSchema);
*/

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
// /questions endpoint: in the request body, the client sends a question text and an image. The server echoes the question and sends the answer to the question and the image back to the client.
// upload.single("<fieldName>")
app.post("/questions", upload.single("image"), async (req, res) => {
  //receive question and image value as form-data type
  const question = req.body.question;
  let imageUrl = req.file.originalname;
  imageUrl = imageUrl.replace(/\\/g, "/");

  //change imageUrl to absolute path
  imageUrl = `${__dirname}\\uploads\\${imageUrl}`;

  console.log(req.file);

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

  // upload image to cloudinary using cloudinary API
  const uploadedImage = await cloudinary.uploader
    .upload(imageUrl, {
      upload_preset: uploadPreset,
    })
    .catch((error) => console.log(error));

  console.log("directory: ", imageUrl);
  console.log(uploadedImage);

  const uploadedImageUrl = uploadedImage.url;

  // send answer and image url back to client
  res.json({ answer, uploadedImageUrl });

  /*
  On client-side, please use this handler:
    const handleFileChange = (e) => {
      const file = e.target.files[0];
      // Add your logic to upload the file
      console.log(file);
      const formData = new FormData();
      formData.append("question", "What is the name of this tree?");
      formData.append("image", file);

      axios
        .post("http://localhost:3001/questions", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        })
        .then((response) => {
          console.log(response);
        })
        .catch((error) => {
          alert(error.message);
        });
    };
    return (
      <>
        <label htmlFor="file-upload" className="custom-file-upload">
          Custom Upload
        </label>
        <input id="file-upload" type="file" onChange={handleFileChange} />
      </>
    );
   */
});

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

app.use(
  cors({
    origin: ["http://localhost:3000", "https://sbuhack-backend.onrender.com"],
    credentials: true,
  })
);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
