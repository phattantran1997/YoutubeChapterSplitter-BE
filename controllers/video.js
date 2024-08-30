const videoRouter = require("express").Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');

// Set up multer for video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../public/uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

const outputFolder = path.join(__dirname, '../public/transcoded');
if (!fs.existsSync(outputFolder)) {
  fs.mkdirSync(outputFolder, { recursive: true });
}

// SSE route for progress updates
videoRouter.get('/progress', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  req.on('close', () => {
    res.end();
  });

  global.ffmpegProgressCallback = (progress) => {
    res.write(`data: ${JSON.stringify(progress)}\n\n`);
  };
});

videoRouter.post('/new', upload.single('video'), async (req, res) => {
  try {
    const inputFilePath = req.file.path;
    const transcodingOption = req.body.transcodingOption;
    const [resolution, codec] = transcodingOption.split('-');
    const outputFilePath = path.join(outputFolder, `transcoded-${Date.now()}.${codec === 'libvpx' ? 'webm' : 'mp4'}`);
    
    ffmpeg(inputFilePath)
      .output(outputFilePath)
      .videoCodec(codec)
      .size(resolution)
      .videoBitrate('20000k') 
      .audioCodec('aac')
      .outputOptions(
        '-preset', 'veryslow',  
        '-movflags', 'faststart',
        '-threads', '4',
        '-crf', '16',  
        '-filter:v', 'hqdn3d,scale=3840:2160,unsharp=5:5:2' 
      )
      .on('start', (commandLine) => {
        console.log('Spawned FFmpeg with command: ' + commandLine);
      })
      .on('progress', (progress) => {
        console.log('Processing: ' + progress.percent + '% done');
        if (global.ffmpegProgressCallback) {
          global.ffmpegProgressCallback(progress);
        }
      })
      .on('end', () => {
        console.log('Transcoding succeeded!');
        if (global.ffmpegProgressCallback) {
          global.ffmpegProgressCallback({ percent: 100, done: true });
        }
        res.status(200).json({ message: 'Video uploaded and transcoded successfully!', outputFilePath });
      })
      .on('error', (err) => {
        console.error('Error during transcoding:', err);
        if (global.ffmpegProgressCallback) {
          global.ffmpegProgressCallback({ error: err.message });
        }
        res.status(500).json({ message: 'Error during transcoding', error: err.message });
      })
      .run();
  } catch (err) {
    console.error('Error handling video upload:', err);
    res.status(500).json({ message: 'Error processing request', error: err.message });
  }
});



module.exports = videoRouter;
