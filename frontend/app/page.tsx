"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Loader2, Upload, Play, Volume2, Mic } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import OpenAI from "openai"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Define types for our messages and API responses
interface SesameMessage {
  text: string;
  speaker: number;
  maxLen: number;
}

interface SesameApiResponse extends OpenAI.Chat.Completions.ChatCompletion {
  combined_audio: string;
}

export default function Home() {
  const [loading, setLoading] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Voice Clone state
  const [cloneText, setCloneText] = useState("")
  const [promptText, setPromptText] = useState("")
  const [promptAudio, setPromptAudio] = useState<File | null>(null)
  const [clonePitch, setClonePitch] = useState(3)
  const [cloneSpeed, setCloneSpeed] = useState(3)
  const [cloneModel, setCloneModel] = useState("spark-tts")
  // Zonos specific state
  const [zonoPitchStd, setZonoPitchStd] = useState(60)
  const [zonoSpeakingRate, setZonoSpeakingRate] = useState(30)
  const [zonoEmotion, setZonoEmotion] = useState("neutral")

  // Voice Create state
  const [createText, setCreateText] = useState("")
  const [gender, setGender] = useState("male")
  const [createPitch, setCreatePitch] = useState(3)
  const [createSpeed, setCreateSpeed] = useState(3)
  const [createModel, setCreateModel] = useState("spark-tts")
  // Kokoro specific state
  const [kokoroVoice, setKokoroVoice] = useState("af_heart")
  const [kokoroLangCode, setKokoroLangCode] = useState("a")
  const [kokoroSpeed, setKokoroSpeed] = useState(1)
  // Sesame specific state
  const [sesameMessages, setSesameMessages] = useState([{ text: "", speaker: 4, maxLen: 3000 }])
  const [sesameTemp, setSesameTemp] = useState(0.2)
  const [sesameMinP, setSesameMinP] = useState(0.8)

  // Whisper Transcription state
  const [transcriptionAudio, setTranscriptionAudio] = useState<File | null>(null)
  const [modelRepo, setModelRepo] = useState("mlx-community/whisper-large-v3-turbo")
  const [wordTimestamps, setWordTimestamps] = useState(true)
  const [transcriptionResult, setTranscriptionResult] = useState<any>(null)
  const [transcriptionText, setTranscriptionText] = useState("")

  // Initialize OpenAI client
  const client = new OpenAI({
    baseURL: "http://localhost:8000/v1",
    apiKey: "dummy-key",
    dangerouslyAllowBrowser: true // Required for client-side usage
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (file: File | null) => void) => {
    if (e.target.files && e.target.files[0]) {
      setter(e.target.files[0])
    }
  }

  const handleVoiceClone = async () => {
    if (!cloneText) return

    setLoading(true)
    setAudioUrl(null)

    try {
      // Convert audio file to base64 if provided
      let audioBase64 = null
      if (promptAudio) {
        const buffer = await promptAudio.arrayBuffer()
        const bytes = new Uint8Array(buffer)
        const binary = bytes.reduce((acc, byte) => acc + String.fromCharCode(byte), '')
        audioBase64 = btoa(binary)
      }

      // Prepare messages array
      const messages = []
      
      // Add prompt text if available
      if (promptText) {
        messages.push({
          role: "user" as const,
          content: [{ type: "text" as const, text: promptText }]
        })
      }
      
      // Add main content with text and audio if available
      const content: Array<any> = [{ type: "text" as const, text: cloneText }]
      
      if (audioBase64) {
        content.push({
          type: "input_audio" as const,
          input_audio: {
            data: audioBase64,
            format: promptAudio?.type.split('/')[1] || 'wav'
          }
        })
      }
      
      messages.push({
        role: "user" as const,
        content: content
      })

      // Configure audio parameters based on selected model
      let audioParams: any = {}
      let modelName = ""
      
      if (cloneModel === "spark-tts") {
        modelName = "spark-tts"
        audioParams = {
          voice: "clone",
          format: "wav",
          pitch: clonePitch,
          speed: cloneSpeed
        }
      } else if (cloneModel === "zonos") {
        modelName = "zonos"
        audioParams = {
          voice: "clone",
          format: "wav",
          pitch_std: zonoPitchStd,
          speaking_rate: zonoSpeakingRate,
          emotion: zonoEmotion
        }
      }

      // @ts-ignore - Ignoring type errors for custom API
      const response = await client.chat.completions.create({
        model: modelName,
        modalities: ["text", "audio"],
        audio: audioParams,
        messages: messages
      })

      const audioData = response.choices[0].message.audio?.data
      
      if (audioData) {
        // Convert base64 to blob
        const binaryString = atob(audioData)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        const blob = new Blob([bytes], { type: 'audio/wav' })
        
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)

        if (audioRef.current) {
          audioRef.current.src = url
          audioRef.current.play()
        }
      }
    } catch (error) {
      console.error("Error generating audio:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleVoiceCreate = async () => {
    if (createModel !== "sesame" && !createText) return
    if (createModel === "sesame" && !sesameMessages.some(msg => msg.text.trim())) return

    setLoading(true)
    setAudioUrl(null)

    try {
      // Configure audio parameters based on selected model
      let audioParams: any = {}
      let modelName = ""
      let messages: Array<any> = []
      
      if (createModel === "spark-tts") {
        modelName = "spark-tts"
        audioParams = {
          voice: gender === 'male' ? 'alloy' : 'shimmer',
          format: "wav",
          pitch: createPitch,
          speed: createSpeed
        }
        messages = [
          {
            role: "user",
            content: [
              { type: "text", text: createText }
            ]
          }
        ]
      } else if (createModel === "zonos") {
        modelName = "zonos"
        audioParams = {
          voice: "zonos",
          format: "wav",
          pitch_std: zonoPitchStd,
          speaking_rate: zonoSpeakingRate,
          emotion: zonoEmotion
        }
        messages = [
          {
            role: "user",
            content: [
              { type: "text", text: createText }
            ]
          }
        ]
      } else if (createModel === "kokoro-tts") {
        modelName = "kokoro-tts"
        audioParams = {
          voice: kokoroVoice,
          format: "wav",
          lang_code: kokoroLangCode,
          speed: kokoroSpeed
        }
        messages = [
          {
            role: "user",
            content: [
              { type: "text", text: createText }
            ]
          }
        ]
      } else if (createModel === "sesame") {
        modelName = "csm-1b"
        const filteredMessages = sesameMessages.filter(msg => msg.text.trim() !== "")
        
        messages = filteredMessages.map(msg => ({
          role: "user",
          text: msg.text
        }))
        
        audioParams = {
          speakers: filteredMessages.map(msg => msg.speaker),
          format: "wav",
          temp: sesameTemp,
          min_p: sesameMinP,
          max_audio_lens: filteredMessages.map(msg => msg.maxLen)
        }
      }

      // @ts-ignore - Ignoring type errors for custom API
      const response = await client.chat.completions.create({
        model: modelName,
        modalities: createModel === "sesame" ? undefined : ["text", "audio"],
        audio: audioParams,
        messages: messages
      })

      let audioData = null
      
      if (createModel === "sesame") {
        // Handle sesame response which has combined_audio
        const sesameResponse = response as unknown as SesameApiResponse;
        audioData = sesameResponse.combined_audio;
      } else {
        // Handle standard response with audio in the first choice
        audioData = response.choices[0].message.audio?.data
      }
      
      if (audioData) {
        // Convert base64 to blob
        const binaryString = atob(audioData)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        const blob = new Blob([bytes], { type: 'audio/wav' })
        
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)

        if (audioRef.current) {
          audioRef.current.src = url
          audioRef.current.play()
        }
      }
    } catch (error) {
      console.error("Error generating audio:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleTranscription = async () => {
    if (!transcriptionAudio) return

    setLoading(true)
    setTranscriptionResult(null)
    setTranscriptionText("")

    try {
      // Convert audio file to base64
      const buffer = await transcriptionAudio.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      const binary = bytes.reduce((acc, byte) => acc + String.fromCharCode(byte), '')
      const audioBase64 = btoa(binary)

      // @ts-ignore - Ignoring type errors for custom API
      const response = await client.chat.completions.create({
        model: "whisper",
        modalities: ["audio"],
        audio: {
          word_timestamps: wordTimestamps,
          model_repo: modelRepo,
        },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "input_audio",
                input_audio: {
                  data: audioBase64,
                  format: transcriptionAudio.type.split('/')[1] || 'wav'
                }
              }
            ]
          }
        ]
      })

      // Convert response to a plain object
      const responseObj = JSON.parse(JSON.stringify(response))
      setTranscriptionResult(responseObj)
      
      // Extract the transcription text
      if (responseObj.choices && responseObj.choices[0] && responseObj.choices[0].message) {
        setTranscriptionText(responseObj.choices[0].message.content)
      }
    } catch (error) {
      console.error("Error transcribing audio:", error)
    } finally {
      setLoading(false)
    }
  }

  // Format timestamps for display
  const formatTimestamps = () => {
    if (!transcriptionResult || 
        !transcriptionResult.choices || 
        !transcriptionResult.choices[0] || 
        !transcriptionResult.choices[0].message ||
        !transcriptionResult.choices[0].message.word_timestamps) {
      return null
    }

    const timestamps = transcriptionResult.choices[0].message.word_timestamps
    
    return (
      <div className="mt-4 max-h-60 overflow-y-auto border rounded p-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left p-1">Word</th>
              <th className="text-left p-1">Start</th>
              <th className="text-left p-1">End</th>
            </tr>
          </thead>
          <tbody>
            {timestamps.map((item: any, index: number) => (
              <tr key={index} className="border-b">
                <td className="p-1">{item.word}</td>
                <td className="p-1">{item.start.toFixed(2)}s</td>
                <td className="p-1">{item.end.toFixed(2)}s</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // Render model-specific controls for voice cloning
  const renderCloneModelControls = () => {
    if (cloneModel === "spark-tts") {
      return (
        <>
          <div>
            <Label>Pitch (1-5)</Label>
            <Slider
              value={[clonePitch]}
              min={1}
              max={5}
              step={1}
              onValueChange={(value) => setClonePitch(value[0])}
              className="my-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Lower</span>
              <span>Default</span>
              <span>Higher</span>
            </div>
          </div>

          <div>
            <Label>Speed (1-5)</Label>
            <Slider
              value={[cloneSpeed]}
              min={1}
              max={5}
              step={1}
              onValueChange={(value) => setCloneSpeed(value[0])}
              className="my-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Slower</span>
              <span>Default</span>
              <span>Faster</span>
            </div>
          </div>
        </>
      )
    } else if (cloneModel === "zonos") {
      return (
        <>
          <div>
            <Label>Pitch Standard (0-400)</Label>
            <Slider
              value={[zonoPitchStd]}
              min={0}
              max={400}
              step={10}
              onValueChange={(value) => setZonoPitchStd(value[0])}
              className="my-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span>200</span>
              <span>400</span>
            </div>
          </div>

          <div>
            <Label>Speaking Rate (0-40)</Label>
            <Slider
              value={[zonoSpeakingRate]}
              min={0}
              max={40}
              step={1}
              onValueChange={(value) => setZonoSpeakingRate(value[0])}
              className="my-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span>20</span>
              <span>40</span>
            </div>
          </div>

          <div>
            <Label>Emotion</Label>
            <Select value={zonoEmotion} onValueChange={setZonoEmotion}>
              <SelectTrigger className="w-full mt-1">
                <SelectValue placeholder="Select emotion" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="neutral">Neutral</SelectItem>
                <SelectItem value="happy">Happy</SelectItem>
                <SelectItem value="sad">Sad</SelectItem>
                <SelectItem value="angry">Angry</SelectItem>
                <SelectItem value="surprised">Surprised</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )
    }
    
    return null
  }

  // Render model-specific controls for voice creation
  const renderCreateModelControls = () => {
    if (createModel === "spark-tts") {
      return (
        <>
          <div>
            <Label>Voice Gender</Label>
            <RadioGroup value={gender} onValueChange={setGender} className="flex space-x-4 mt-1">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="male" id="male" />
                <Label htmlFor="male">Male</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="female" id="female" />
                <Label htmlFor="female">Female</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label>Pitch (1-5)</Label>
            <Slider
              value={[createPitch]}
              min={1}
              max={5}
              step={1}
              onValueChange={(value) => setCreatePitch(value[0])}
              className="my-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Lower</span>
              <span>Default</span>
              <span>Higher</span>
            </div>
          </div>

          <div>
            <Label>Speed (1-5)</Label>
            <Slider
              value={[createSpeed]}
              min={1}
              max={5}
              step={1}
              onValueChange={(value) => setCreateSpeed(value[0])}
              className="my-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Slower</span>
              <span>Default</span>
              <span>Faster</span>
            </div>
          </div>
        </>
      )
    } else if (createModel === "zonos") {
      return (
        <>
          <div>
            <Label>Pitch Standard (0-400) - {zonoPitchStd}</Label>
            <Slider
              value={[zonoPitchStd]}
              min={0}
              max={400}
              step={10}
              onValueChange={(value) => setZonoPitchStd(value[0])}
              className="my-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span>200</span>
              <span>400</span>
            </div>
          </div>

          <div>
            <Label>Speaking Rate (0-40) - {zonoSpeakingRate}</Label>
            <Slider
              value={[zonoSpeakingRate]}
              min={0}
              max={40}
              step={1}
              onValueChange={(value) => setZonoSpeakingRate(value[0])}
              className="my-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span>20</span>
              <span>40</span>
            </div>
          </div>

          <div>
            <Label>Emotion</Label>
            <Select value={zonoEmotion} onValueChange={setZonoEmotion}>
              <SelectTrigger className="w-full mt-1">
                <SelectValue placeholder="Select emotion" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="neutral">Neutral</SelectItem>
                <SelectItem value="happy">Happy</SelectItem>
                <SelectItem value="sad">Sad</SelectItem>
                <SelectItem value="angry">Angry</SelectItem>
                <SelectItem value="surprised">Surprised</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )
    } else if (createModel === "kokoro-tts") {
      return (
        <>
          <div>
            <Label>Voice</Label>
            <Select value={kokoroVoice} onValueChange={setKokoroVoice}>
              <SelectTrigger className="w-full mt-1">
                <SelectValue placeholder="Select voice" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="af_heart">AF Heart</SelectItem>
                <SelectItem value="af_soul">AF Soul</SelectItem>
                <SelectItem value="am_heart">AM Heart</SelectItem>
                <SelectItem value="am_soul">AM Soul</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Language Code</Label>
            <Input
              value={kokoroLangCode}
              onChange={(e) => setKokoroLangCode(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Speed</Label>
            <Slider
              value={[kokoroSpeed]}
              min={0.5}
              max={2}
              step={0.1}
              onValueChange={(value) => setKokoroSpeed(value[0])}
              className="my-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Slower (0.5)</span>
              <span>Normal (1.0)</span>
              <span>Faster (2.0)</span>
            </div>
          </div>
        </>
      )
    } else if (createModel === "sesame") {
      return (
        <>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Conversation Messages</Label>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSesameMessages([...sesameMessages, { text: "", speaker: 4, maxLen: 3000 }])}
              >
                Add Message
              </Button>
            </div>
            
            {sesameMessages.map((message, index) => (
              <div key={index} className="p-3 border rounded-md space-y-3">
                <div className="flex justify-between items-center">
                  <Label>Message {index + 1}</Label>
                  {sesameMessages.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newMessages = [...sesameMessages]
                        newMessages.splice(index, 1)
                        setSesameMessages(newMessages)
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                
                <Textarea
                  placeholder="Enter message text..."
                  value={message.text}
                  onChange={(e) => {
                    const newMessages = [...sesameMessages]
                    newMessages[index].text = e.target.value
                    setSesameMessages(newMessages)
                  }}
                  className="h-20"
                />
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Speaker ID</Label>
                    <Select 
                      value={String(message.speaker)}
                      onValueChange={(value) => {
                        const newMessages = [...sesameMessages]
                        newMessages[index].speaker = parseInt(value)
                        setSesameMessages(newMessages)
                      }}
                    >
                      <SelectTrigger className="w-full mt-1">
                        <SelectValue placeholder="Select speaker" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Speaker 1</SelectItem>
                        <SelectItem value="2">Speaker 2</SelectItem>
                        <SelectItem value="3">Speaker 3</SelectItem>
                        <SelectItem value="4">Speaker 4</SelectItem>
                        <SelectItem value="5">Speaker 5</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Max Length</Label>
                    <Input
                      type="number"
                      value={message.maxLen}
                      onChange={(e) => {
                        const newMessages = [...sesameMessages]
                        newMessages[index].maxLen = parseInt(e.target.value) || 0
                        setSesameMessages(newMessages)
                      }}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div>
            <Label>Expressiveness (0-1) - {sesameTemp}</Label>
            <Slider
              value={[sesameTemp]}
              min={0}
              max={1}
              step={0.1}
              onValueChange={(value) => setSesameTemp(value[0])}
              className="my-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Less (0.0)</span>
              <span>Default (0.2)</span>
              <span>More (1.0)</span>
            </div>
          </div>
          
          <div>
            <Label>Speech Clarity (0-1) - {sesameMinP}</Label>
            <Slider
              value={[sesameMinP]}
              min={0}
              max={1}
              step={0.1}
              onValueChange={(value) => setSesameMinP(value[0])}
              className="my-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Less (0.0)</span>
              <span>Default (0.8)</span>
              <span>More (1.0)</span>
            </div>
          </div>
        </>
      )
    }
    
    return null
  }

  return (
    <main className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6 text-center">LocalSpeech AI playground</h1>

      <Tabs defaultValue="clone" className="max-w-3xl mx-auto">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="clone">Voice Cloning</TabsTrigger>
          <TabsTrigger value="create">Voice Creation</TabsTrigger>
          <TabsTrigger value="transcribe">Whisper Transcription</TabsTrigger>
        </TabsList>

        <TabsContent value="clone" className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label>TTS Model</Label>
              <Select value={cloneModel} onValueChange={setCloneModel}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Select TTS model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spark-tts">Spark TTS</SelectItem>
                  <SelectItem value="zonos">Zonos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="clone-text">Text to Convert</Label>
              <Textarea
                id="clone-text"
                placeholder="Enter text to convert to speech..."
                value={cloneText}
                onChange={(e) => setCloneText(e.target.value)}
                className="h-32"
              />
            </div>

            <div>
              <Label htmlFor="prompt-text">Prompt Text (Optional)</Label>
              <Input
                id="prompt-text"
                placeholder="Enter prompt text..."
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="prompt-audio">Voice Sample</Label>
              <div className="flex items-center gap-4 mt-1">
                <Button
                  variant="outline"
                  onClick={() => document.getElementById("prompt-audio")?.click()}
                  className="w-full"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {promptAudio ? promptAudio.name : "Upload Audio Sample"}
                </Button>
                <Input
                  id="prompt-audio"
                  type="file"
                  accept=".wav,.mp3,.m4a"
                  onChange={(e) => handleFileChange(e, setPromptAudio)}
                  className="hidden"
                />
              </div>
            </div>

            {renderCloneModelControls()}

            <Button onClick={handleVoiceClone} disabled={loading || !cloneText} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Generate Audio
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="create" className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label>TTS Model</Label>
              <Select value={createModel} onValueChange={setCreateModel}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Select TTS model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spark-tts">Spark TTS</SelectItem>
                  <SelectItem value="zonos">Zonos</SelectItem>
                  <SelectItem value="kokoro-tts">Kokoro TTS</SelectItem>
                  <SelectItem value="sesame">Sesame TTS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {createModel !== "sesame" && (
              <div>
                <Label htmlFor="create-text">Text to Convert</Label>
                <Textarea
                  id="create-text"
                  placeholder="Enter text to convert to speech..."
                  value={createText}
                  onChange={(e) => setCreateText(e.target.value)}
                  className="h-32"
                />
              </div>
            )}

            {renderCreateModelControls()}

            <Button onClick={handleVoiceCreate} disabled={loading || (createModel !== "sesame" && !createText) || (createModel === "sesame" && !sesameMessages.some(msg => msg.text.trim()))} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Generate Audio
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="transcribe" className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="transcription-audio">Audio to Transcribe</Label>
              <div className="flex items-center gap-4 mt-1">
                <Button
                  variant="outline"
                  onClick={() => document.getElementById("transcription-audio")?.click()}
                  className="w-full"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {transcriptionAudio ? transcriptionAudio.name : "Upload Audio File"}
                </Button>
                <Input
                  id="transcription-audio"
                  type="file"
                  accept=".wav,.mp3,.m4a,.ogg"
                  onChange={(e) => handleFileChange(e, setTranscriptionAudio)}
                  className="hidden"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="model-repo">Model Repository</Label>
              <Input
                id="model-repo"
                placeholder="Enter model repository..."
                value={modelRepo}
                onChange={(e) => setModelRepo(e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="word-timestamps" 
                checked={wordTimestamps}
                onCheckedChange={(checked) => setWordTimestamps(checked === true)}
              />
              <Label htmlFor="word-timestamps">Generate word timestamps</Label>
            </div>

            <Button 
              onClick={handleTranscription} 
              disabled={loading || !transcriptionAudio} 
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Transcribing...
                </>
              ) : (
                <>
                  <Mic className="mr-2 h-4 w-4" />
                  Transcribe Audio
                </>
              )}
            </Button>

            {transcriptionText && (
              <div className="mt-4">
                <Label>Transcription</Label>
                <div className="p-3 border rounded-md bg-muted/30 mt-1">
                  <p>{transcriptionText}</p>
                </div>
              </div>
            )}

            {wordTimestamps && formatTimestamps()}
          </div>
        </TabsContent>
      </Tabs>

      {audioUrl && (
        <div className="mt-8 max-w-3xl mx-auto p-4 border rounded-lg bg-muted/30">
          <h2 className="text-lg font-medium flex items-center mb-3">
            <Volume2 className="mr-2 h-5 w-5" />
            Generated Audio
          </h2>
          <audio ref={audioRef} controls className="w-full" src={audioUrl}>
            Your browser does not support the audio element.
          </audio>
        </div>
      )}
    </main>
  )
}

