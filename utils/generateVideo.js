// Import required modules
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

require("dotenv").config();

// Function to start the video generation
async function startVideoGeneration(url) {
  const image = await axios
    .get(url, { responseType: "arraybuffer" })
    .catch((error) => {
      console.error("Error fetching image:", error);
      throw error;
    });

  const imageBuffer = Buffer.from(image.data);

  const data = new FormData();
  data.append("image", imageBuffer, "oj770lkkkwynmn6rqguw.jpg");
  data.append("seed", 0);
  data.append("cfg_scale", 1.8);
  data.append("motion_bucket_id", 127);

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
