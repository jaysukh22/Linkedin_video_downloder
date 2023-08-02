const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const request = require("request");

const app = express();
const port = 3000;

app.set("view engine", "ejs");

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.render("index", { videoUrl: null });
});

function getLinkedInPostId(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const postId = pathname.match(/\/([^/]+)\/?$/);
    if (postId && postId.length > 1) {
      return postId[1];
    } else {
      return null; // If the URL format is not recognized or doesn't contain a post ID
    }
  } catch (error) {
    console.error("Error:", error);
    return null; // If the URL is invalid or any other error occurs
  }
}

app.get("/views", async (req, res) => {
  try {
    const { videoUrl } = req.query;
    if (!videoUrl) {
      return res.render("app", { videoUrl: null });
    }

    const response = await axios.get(videoUrl);
    const $ = cheerio.load(response.data);
    const scriptContent = $('script[type="application/ld+json"]').html();
    const jsonLdObject = JSON.parse(scriptContent);

    // Extract the video URL and other relevant data
    const videoData = jsonLdObject.sharedContent.url;

    res.render("Download", { videoUrl: videoData, url: videoUrl });
  } catch (error) {
    console.error("Error:", error);
    res.render("index", { videoUrl: null });
  }
});

app.get("/download", async (req, res) => {
  try {
    const { videoUrl } = req.query;
    if (!videoUrl) {
      return res.render("app", { videoUrl: null });
    }

    const response = await axios.get(videoUrl);
    const $ = cheerio.load(response.data);
    const scriptContent = $('script[type="application/ld+json"]').html();

    const jsonLdObject = JSON.parse(scriptContent);

    // Extract the video URL and other relevant data
    const videoData = jsonLdObject.sharedContent.url;

    // Set the path where the video will be saved
    const filePath = `${getLinkedInPostId(videoUrl)}.mp4`;
  
    // Download the video file using the 'request' module
    const videoStream = request.get(videoData);
    const fileStream = fs.createWriteStream(filePath);

    videoStream.pipe(fileStream);

    fileStream.on("finish", () => {
      res.download(filePath, filePath, (err) => {
        if (err) {
          console.error("Error:", err);
          res.render("index", { videoUrl: null });
        }

        // Remove the temporary file after download is complete
        fs.unlink(filePath, (err) => {
          if (err) console.error("Error:", err);
        });
      });
    });
  } catch (error) {
    console.error("Error:", error);
    res.render("index", { videoUrl: null });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
