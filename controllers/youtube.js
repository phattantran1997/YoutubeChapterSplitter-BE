const youtubeRouter = require("express").Router();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const youtubedl = require('youtube-dl-exec');

youtubeRouter.post('/trim-video', async (req, res) => {
  const { videoId, chapters } = req.body;
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  // let outputFolder = process.env.TRIMMED_VIDEOS_PATH || '/tmp/';
  // outputFolder = path.join(outputFolder, 'trimmed_videos');

  const outputFolder = path.join(__dirname, '../public/trimmed_videos')
  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder);
  }

  try {
    const videoFile = path.join(outputFolder, `${videoId}.mp4`);

    await youtubedl(videoUrl, {
      output: videoFile,
      format: 'best[ext=mp4]/mp4',
    });
    console.log('Video downloaded successfully as MP4.');

    const getVideoDuration = () => {
      return new Promise((resolve, reject) => {
        exec(`ffprobe -v error -show_entries format=duration -of csv=p=0 ${videoFile}`, (err, stdout) => {
          if (err) {
            return reject(err);
          }
          resolve(parseFloat(stdout.trim()));
        });
      });
    };

    const videoDuration = await getVideoDuration();
    console.log(`Video duration: ${videoDuration} seconds`);

    chapters.forEach((chapter, index) => {
      const sanitizedTitle = chapter.title.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_');

      const outputFileName = path.join(
        outputFolder,
        `${videoId}_${sanitizedTitle}.mp4`
      );
      const startTime = chapter.timestamp;
      const endTime = chapters[index + 1]
        ? chapters[index + 1].timestamp
        : videoDuration;
      const command = `ffmpeg -i ${videoFile} -ss ${startTime} -to ${endTime} -c copy ${outputFileName}`;

      exec(command, (err) => {
        if (err) {
          console.error(`Error trimming ${chapter.title}:`, err);
        } else {
          console.log(`Chapter ${index + 1} saved as ${outputFileName}`);
        }
      });
    });

    res.send('Video trimming started');
  } catch (err) {
    console.error('Error downloading video:', err);
    res.status(500).send('Error downloading video');
  }
});


youtubeRouter.get('/download-video/:filename', async (req, res) => {
  const filename = req.params.filename;
  const outputFolder = path.join(__dirname, '../public/trimmed_videos');
  const outputFileName = path.join(
    outputFolder,
    `${filename}`
  );
  
  try {
    res.status(200).download(outputFileName, filename, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        if (!res.headersSent) {
          res.status(500).send('Error downloading file');
        }
      }
    });

  } catch (err) {
    console.error('Error processing download request:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

});
youtubeRouter.get('/videos/:filename', (req, res) => {
  const filename = req.params.filename+'.mp4';
  const outputFolder = path.join(__dirname, '../public/trimmed_videos');
  const outputFileName = path.join(
    outputFolder,
    `${filename}`
  );

  res.sendFile(outputFileName, (err) => {
    if (err) {
      console.error('Error sending file:', err);
      if (!res.headersSent) {
        res.status(500).send('Error sending file');
      }
    }
  });
});
module.exports = youtubeRouter;
