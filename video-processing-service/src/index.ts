import express from "express";
import ffmpeg from "fluent-ffmpeg";
import {
  uploadProcessedVideo,
  downloadRawVideo,
  deleteRawVideo,
  deleteProcessedVideo,
  convertVideo,
  setupDirectories,
} from "./storage";

const port = process.env.PORT || 3001;
setupDirectories();
const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.post("/process-video-test", (req, res) => {
  // Get the path of the input video file from the request body
  const inputFilePath = req.body.inputFilePath;
  const outputFilePath = req.body.outputFilePath;

  // Check if the input file path is defined
  if (!inputFilePath || !outputFilePath) {
    return res.status(400).send("Bad Request: Missing file path");
  }

  // Create the ffmpeg command
  ffmpeg(inputFilePath)
    .outputOptions("-vf", "scale=-1:360") // 360p
    .on("end", function () {
      console.log("Processing finished successfully");
      res.status(200).send("Processing finished successfully");
    })
    .on("error", function (err: any) {
      console.log("An error occurred: " + err.message);
      res.status(500).send("An error occurred: " + err.message);
    })
    .save(outputFilePath);
});

// Process a video file from Cloud Storage into 360p
app.post("/process-video", async (req, res) => {
  // Get the bucket and filename from the Cloud Pub/Sub message
  let data;
  try {
    const message = Buffer.from(req.body.message.data, "base64").toString(
      "utf8"
    );
    data = JSON.parse(message);
    if (!data.name) {
      throw new Error("Invalid message payload received.");
    }
  } catch (error) {
    console.error(error);
    return res.status(400).send("Bad Request: missing filename.");
  }

  const inputFileName = data.name;
  const outputFileName = `processed-${inputFileName}`;

  // Download the raw video from Cloud Storage
  await downloadRawVideo(inputFileName);

  // Process the video into 360p
  try {
    await convertVideo(inputFileName, outputFileName);
  } catch (err) {
    await Promise.all([
      deleteRawVideo(inputFileName),
      deleteProcessedVideo(outputFileName),
    ]);
    return res.status(500).send("Processing failed");
  }

  // Upload the processed video to Cloud Storage
  await uploadProcessedVideo(outputFileName);

  await Promise.all([
    deleteRawVideo(inputFileName),
    deleteProcessedVideo(outputFileName),
  ]);

  return res.status(200).send("Processing finished successfully");
});

app.listen(port, () => {
  console.log(`Video processing service listening at port ${port}`);
});
