import AudioTranscription from './AudioTranscription'

function App() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">
          Audio Translation App
        </h1>
        <AudioTranscription />
      </div>
    </div>
  )
}

export default App