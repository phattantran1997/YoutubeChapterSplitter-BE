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

  //Create Thumbnail
  const outputThumbFolder = path.join(__dirname, '../public/thumbnail')
  if (!fs.existsSync(outputThumbFolder)) {
    fs.mkdirSync(outputThumbFolder);
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


      const outputThumbnailFileName = path.join(
        outputThumbFolder,
        `${videoId}_${sanitizedTitle}.png`
      );
      const cmd = `ffmpeg -i ${videoFile} -ss ${startTime} -vframes 1 ${outputThumbnailFileName}`;

      exec(cmd, (error, stdout, stderr) => {
          if (error) {
              console.error(`Error creating thumbnail: ${error.message}`);
              return;
          }
          if (stderr) {
              console.error(`Stderr: ${stderr}`);
          }
          console.log('Thumbnail is created!');

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
  const filename = req.params.filename;
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
=======

youtubeRouter.get('/videos/:filename', (req, res) => {
  const filename = req.params.filename+'.mp4';
  const videoPath = path.join(__dirname, '../public/trimmed_videos/'+filename); 

  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize) {
          res.status(416).send('Requested range not satisfiable\n' + start + ' >= ' + fileSize);
          return;
      }

      const chunkSize = (end - start) + 1;
      const file = fs.createReadStream(videoPath, { start, end });
      const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': 'video/mp4',
      };

      res.writeHead(206, head);
      file.pipe(res);
  } else {
      const head = {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4',
      };
      res.writeHead(200, head);
      fs.createReadStream(videoPath).pipe(res);
  }
});

>>>>>>> Stashed changes
module.exports = youtubeRouter;
