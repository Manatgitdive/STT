import React, { useState } from 'react';

const AudioTranscription = () => {
  const [audioFile, setAudioFile] = useState(null);
  const [transcription, setTranscription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const API_KEY = 'AIzaSyCgbW8Z6Ll_voAAidD7jbwSU5x5YHohkEg';

  // Common Kannada phrases
  const KANNADA_PHRASES = [
    "ನಮಸ್ಕಾರ", "ಹೇಗಿದ್ದೀರಿ", "ಧನ್ಯವಾದ", 
    "ವ್ಯಾಪಾರ", "ಮಾರಾಟ", "ಬೆಲೆ", "ದರ", 
    "ಹಣ", "ರೂಪಾಯಿ", "ಲೆಕ್ಕ", "ಪಾವತಿ"
  ];

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('File size too large. Maximum size is 10MB.');
        return;
      }
      setAudioFile(file);
      setError('');
      setTranscription('');
    }
  };

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const transcribeAudio = async () => {
    if (!audioFile) {
      setError('Please upload an audio file');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const base64Audio = await convertToBase64(audioFile);

      // Remove sampleRateHertz from config to let Google detect it automatically
      const requestConfig = {
        config: {
          languageCode: 'kn-IN',
          alternativeLanguageCodes: ['en-IN'],
          enableAutomaticPunctuation: true,
          model: 'latest_long',
          encoding: audioFile.type.includes('wav') ? 'LINEAR16' : 
                   audioFile.type.includes('mp3') ? 'MP3' : 
                   'ENCODING_UNSPECIFIED',
          audioChannelCount: 1,
          enableWordTimeOffsets: true,
          enableWordConfidence: true,
          useEnhanced: true,
          metadata: {
            interactionType: 'PHONE_CALL',
            microphoneDistance: 'NEARFIELD',
            originalMediaType: 'AUDIO',
            recordingDeviceType: 'PHONE_LINE'
          },
          maxAlternatives: 1,
          profanityFilter: false,
          adaptation: {
            phraseSets: [{
              phrases: KANNADA_PHRASES.map(phrase => ({
                value: phrase,
                boost: 15
              }))
            }]
          },
          speechContexts: [{
            phrases: KANNADA_PHRASES,
            boost: 15
          }]
        },
        audio: {
          content: base64Audio
        }
      };

      // Using recognize endpoint for shorter files
      const transcribeResponse = await fetch(
        `https://speech.googleapis.com/v1/speech:recognize?key=${API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestConfig)
        }
      );

      if (!transcribeResponse.ok) {
        const errorData = await transcribeResponse.json();
        throw new Error(errorData.error?.message || 'Transcription failed');
      }

      const transcribeResult = await transcribeResponse.json();

      if (!transcribeResult?.results?.length) {
        throw new Error('No speech detected in the audio');
      }

      // Combine all transcriptions
      const kannadaText = transcribeResult.results
        .map(result => result.alternatives[0].transcript)
        .join(' ');

      // Translate to English
      const translateResponse = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            q: kannadaText,
            source: 'kn',
            target: 'en',
            format: 'text',
            model: 'nmt'
          })
        }
      );

      if (!translateResponse.ok) {
        throw new Error('Translation failed');
      }

      const translateResult = await translateResponse.json();
      
      setTranscription(
        `Kannada Text:\n${kannadaText}\n\n` +
        `English Translation:\n${translateResult.data.translations[0].translatedText}`
      );

    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'Error processing audio');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Kannada Audio Transcription</h1>
      
      <div className="space-y-4">
        <input
          type="file"
          accept="audio/wav,audio/mp3"
          onChange={handleFileUpload}
          className="block w-full p-2 border rounded"
        />

        {audioFile && (
          <div className="p-4 bg-gray-100 rounded">
            <p>Selected File: {audioFile.name}</p>
            <p>Size: {(audioFile.size / 1024 / 1024).toFixed(2)} MB</p>
            <p>Type: {audioFile.type}</p>
            <audio controls className="mt-2 w-full">
              <source src={URL.createObjectURL(audioFile)} type={audioFile.type} />
            </audio>
          </div>
        )}

        <button
          onClick={transcribeAudio}
          disabled={!audioFile || isLoading}
          className={`w-full py-2 rounded text-white ${
            !audioFile || isLoading ? 'bg-gray-400' : 'bg-blue-500'
          }`}
        >
          {isLoading ? 'Processing... Please wait' : 'Transcribe to English'}
        </button>

        {error && (
          <div className="p-4 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        {transcription && (
          <div className="mt-4">
            <div className="p-4 bg-white border rounded whitespace-pre-wrap">
              {transcription}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioTranscription;