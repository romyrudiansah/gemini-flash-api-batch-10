const express = require('express');
const dotenv = require('dotenv');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

dotenv.config();
const app = express();

app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'models/gemini-1.5-flash'});

const upload = multer({ dest: 'uploads/' });

const PORT = 3000

function imageToGenerativePart(filePath) {
  const mimeType = 'image/png'; // or detect from filePath if needed
  const imageBuffer = fs.readFileSync(filePath);
  return {
    inlineData: {
      data: imageBuffer.toString('base64'),
      mimeType: mimeType,
    },
  };
}

app.listen(PORT, () => {
  console.log(`Gemini API server is running at http://localhost:${PORT}`);
})

app.post('/generate-text', async (req, res) => {
  const { prompt } = req.body;

  try {
    const result = await model.generateContent(prompt);
    const response = result?.text ? result : result?.response;

    if (response && typeof response.text === 'function') {
      res.json({ output: response.text() });
    } else {
      res.status(500).json({ error: 'Invalid response from Gemini API' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
})

app.post('/generate-from-image', upload.single('image'), async (req, res) => {
  const { prompt } = req.body;
  const image = imageToGenerativePart(req.file.path);

  try {
    const result = await model.generateContent([prompt, image]);
    const response = result?.text ? result : result?.response;

    if (response && typeof response.text === 'function') {
      res.json({ output: response.text() });
    } else {
      res.status(500).json({ error: 'Invalid response from Gemini API' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    fs.unlinkSync(req.file.path);
  }
});


app.post('/generate-from-document', upload.single('document'), async (req, res) => {
  const filePath = req.file.path;
  const buffer = fs.readFileSync(filePath);
  const base64Data = buffer.toString('base64');
  const mimeType = req.file.mimetype;

  try {
    const documentPart = {
      inlineData : { data: base64Data, mimeType }
    }

    const result = await model.generateContent(['Analyze this document: ', documentPart]);
    const response = await result.response;
    
    res.json({ output: response.text() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    fs.unlinkSync(req.file.path);
  }
});

app.post('/generate-from-audio', upload.single('audio'), async (req, res) => {
  const filePath = req.file.path;
  const audioBuffer = fs.readFileSync(filePath);
  const base64Data = audioBuffer.toString('base64');
  const mimeType = req.file.mimetype;

  try {
    const audioPart = {
      inlineData: { data: base64Data, mimeType }
    };

    const result = await model.generateContent(['Transcribe or Analyze the following audio:', audioPart]);
    const response = await result.response;

    res.json({ output: response.text() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    fs.unlinkSync(req.file.path);
  }
});