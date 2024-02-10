// Import required modules
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

require("dotenv").config();

// Function to start the video generation
async function startVideoGeneration(url, isForKids) {
  const image = await axios
    .get(url, { responseType: "arraybuffer" })
    .catch((error) => {
      console.error("Error fetching image:", error);
      throw error;
    });

  let imageBuffer = Buffer.from(image.data);

  let data = new FormData();

  data.append("seed", 0);
  data.append("cfg_scale", 1.8);
  data.append("motion_bucket_id", 127);

  /*
  const formData = new FormData();
  formData.append("init_image", fs.readFileSync(initImagePath));
  formData.append("init_image_mode", "IMAGE_STRENGTH");
  formData.append("image_strength", 0.35);
  formData.append(
    "text_prompts[0][text]",
    "change character in image into comic-book style and show its motion"
  );
  formData.append("cfg_scale", 7);
  formData.append("samples", 1);
  formData.append("steps", 30);
  */

  if (!isForKids) {
    console.log("isForKids is true");

    const formData = new FormData();
    formData.append("init_image", imageBuffer);
    formData.append("init_image_mode", "IMAGE_STRENGTH");
    formData.append("image_strength", 0.35);
    formData.append(
      "text_prompts[0][text]",
      "change character in image into comic-book style and show its motion"
    );
    formData.append("cfg_scale", 7);
    formData.append("samples", 1);
    formData.append("steps", 30);

    const responseAnimeImageBuffer = await axios.post(
      `https://api.stability.ai/v1/generation/stable-diffusion-v1-6/image-to-image`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          Accept: "image/png",
          Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
        },
        responseType: "arraybuffer", // To handle binary data
      }
    );

    imageBuffer = Buffer.from(responseAnimeImageBuffer.data);
  }

  data.append("image", imageBuffer, "image.jpg");

  try {
    const response = await axios.request({
      url: `https://api.stability.ai/v2alpha/generation/image-to-video`,
      method: "post",
      headers: {
        authorization: process.env["STABILITY_API_KEY"], // Replace with your actual API key
        ...data.getHeaders(),
      },
      data: data,
    });

    console.log("Generation ID:", response.data.id);
    return response.data.id;
  } catch (error) {
    console.error("Error starting video generation:", error);
    throw error;
  }
}

// Function to fetch the video result
async function fetchVideoResult(generationID) {
  const response = await axios.request({
    url: `https://api.stability.ai/v2alpha/generation/image-to-video/result/${generationID}`,
    method: "GET",
    validateStatus: undefined,
    responseType: "arraybuffer",
    headers: {
      accept: "video/*", // Use 'application/json' to receive base64 encoded JSON
      authorization: `Bearer sk-MYAPIKEY`, // Use the same API key
    },
  });

  if (response.status === 200) {
    console.log("Video generation result found");
    return response.data;
  }

  return false;
}

// Main function to orchestrate the video generation and fetching
async function generateAndFetchVideo() {
  try {
    const generationID = await startVideoGeneration();
    const result = await fetchVideoResult(generationID);
    return result;
  } catch (error) {
    console.error("Error in video generation process:", error);
  }
}

module.exports = { startVideoGeneration, fetchVideoResult };
