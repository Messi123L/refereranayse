import { useState, useRef, FormEvent } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Video, Image as ImageIcon, Send, AlertCircle, Loader2, X, FileText, Gavel, ShieldAlert, Globe, Mic, MicOff, ThumbsUp, ThumbsDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const getSystemInstruction = (lang: 'fr' | 'ar') => `Tu es un expert arbitral FIFA/IFAB 2025/26.

TON RÔLE:
1. Analyser les situations de jeu (vidéo/image/texte)
2. Identifier les lois applicables
3. Fournir des décisions conformes aux règles
4. Expliquer clairement en ${lang === 'fr' ? 'Français' : 'Arabe'}
5. Citer les articles spécifiques des Lois du Jeu

TON STYLE:
- Professionnel et précis
- Pédagogique
- Neutre et objectif
- Basé uniquement sur les règles officielles
- Rapide et concis

STRUCTURE DE RÉPONSE OBLIGATOIRE (utilise exactement ce format avec les emojis, en gras pour les titres) :
${lang === 'fr' ? `**📋 Situation :** [Description]
**⚽ Loi applicable :** [Numéro + Titre]
**📖 Article :** [Référence précise]
**✅ Décision :** [Décision]
**🟨 Sanction :** [Sanction]
**💡 Explication :** [Texte français]` : `**📋 الحالة:** [الوصف]
**⚽ القانون المطبق:** [الرقم + العنوان]
**📖 المادة:** [مرجع دقيق]
**✅ القرار:** [القرار]
**🟨 العقوبة:** [العقوبة]
**💡 الشرح:** [النص العربي]`}

LIMITES:
- Ne jamais inventer de règles
- Toujours se référer aux Lois 2025/26
- Signaler les situations ambiguës
- Recommander VAR si nécessaire
- RÉPONDRE UNIQUEMENT EN ${lang === 'fr' ? 'FRANÇAIS' : 'ARABE'}`;

const extractFrames = async (file: File, maxFrames = 8): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';

    video.onloadedmetadata = async () => {
      try {
        const duration = video.duration;
        const safeDuration = (duration && duration !== Infinity) ? duration : 10;
        const interval = safeDuration / maxFrames;
        const frames: string[] = [];
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) throw new Error("Canvas not supported");

        // Scale down to max 800px width to save bandwidth
        const scale = Math.min(800 / video.videoWidth, 1);
        canvas.width = video.videoWidth * scale;
        canvas.height = video.videoHeight * scale;

        for (let i = 0; i < maxFrames; i++) {
          const time = Math.min(Math.max(i * interval, 0.1), safeDuration - 0.1);
          video.currentTime = time;
          
          await new Promise((r) => { 
            const handler = () => { video.removeEventListener('seeked', handler); r(null); };
            video.addEventListener('seeked', handler);
            // Fallback timeout in case seeked doesn't fire
            setTimeout(() => { video.removeEventListener('seeked', handler); r(null); }, 1500);
          });
          
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          frames.push(dataUrl.split(',')[1]);
        }
        URL.revokeObjectURL(url);
        resolve(frames);
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load video"));
    };
  });
};

export default function App() {
  const [lang, setLang] = useState<'fr' | 'ar'>('fr');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError(lang === 'fr' ? "La reconnaissance vocale n'est pas supportée par votre navigateur." : "التعرف على الصوت غير مدعوم في متصفحك.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = lang === 'fr' ? 'fr-FR' : 'ar-SA';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setText((prev) => prev + (prev ? ' ' : '') + finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      if (selectedFile.type.startsWith('video/') && selectedFile.size > 50 * 1024 * 1024) {
        setError(lang === 'fr' ? "La vidéo est trop volumineuse (max 50MB)." : "الفيديو كبير جداً (الحد الأقصى 50 ميجابايت).");
        return;
      } else if (!selectedFile.type.startsWith('video/') && selectedFile.size > 4 * 1024 * 1024) {
        setError(lang === 'fr' ? "L'image est trop volumineuse (max 4MB)." : "الصورة كبيرة جداً (الحد الأقصى 4 ميجابايت).");
        return;
      }
      
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !file) {
      setError(lang === 'fr' ? "Veuillez décrire la situation ou télécharger un fichier." : "يرجى وصف الحالة أو رفع ملف.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setFeedback(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const parts: any[] = [];

      if (text.trim()) {
        parts.push({ text: text.trim() });
      } else {
        parts.push({ text: lang === 'fr' ? "Analyse cette situation d'arbitrage selon les lois du jeu." : "حلل هذه الحالة التحكيمية وفقاً لقوانين اللعبة." });
      }

      if (file) {
        if (file.type.startsWith('video/')) {
          setExtracting(true);
          try {
            const frames = await extractFrames(file, 8);
            setExtracting(false);
            parts.push({ text: lang === 'fr' ? "[Séquence d'images extraites de la vidéo pour analyse temporelle]" : "[تسلسل من الصور المستخرجة من الفيديو للتحليل الزمني]" });
            frames.forEach(frame => {
              parts.push({
                inlineData: {
                  data: frame,
                  mimeType: 'image/jpeg',
                },
              });
            });
          } catch (err) {
            setExtracting(false);
            throw new Error(lang === 'fr' ? "Erreur lors de l'extraction des images de la vidéo." : "خطأ أثناء استخراج الصور من الفيديو.");
          }
        } else {
          const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              resolve(result.split(',')[1]);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          parts.push({
            inlineData: {
              data: base64Data,
              mimeType: file.type,
            },
          });
        }
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: { parts },
        config: {
          systemInstruction: getSystemInstruction(lang),
          temperature: 0.2,
        },
      });

      setResult(response.text || (lang === 'fr' ? "Aucune réponse générée." : "لم يتم إنشاء أي رد."));
    } catch (err: any) {
      console.error(err);
      const errorMessage = err.message || "";
      if (errorMessage.includes('xhr error') || errorMessage.includes('code: 6')) {
        setError(lang === 'fr' ? "Erreur réseau : la requête est trop volumineuse pour le serveur." : "خطأ في الشبكة: الطلب كبير جداً على الخادم.");
      } else {
        setError(errorMessage || (lang === 'fr' ? "Une erreur s'est produite lors de l'analyse." : "حدث خطأ أثناء التحليل."));
      }
    } finally {
      setLoading(false);
      setExtracting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-yellow-200" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="bg-slate-900 text-white py-6 shadow-md sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative w-10 h-10 flex items-center justify-center">
              <div className="absolute w-8 h-10 bg-yellow-400 rounded-sm shadow-sm transform -rotate-12 translate-x-1"></div>
              <div className="absolute w-8 h-10 bg-red-500 rounded-sm shadow-sm transform rotate-6 -translate-x-1"></div>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight leading-tight">
                FIFA Expert
              </h1>
              <p className="text-slate-400 text-sm font-medium">
                {lang === 'fr' ? 'Expert arbitral FIFA' : 'خبير تحكيم الفيفا'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-slate-400 text-sm font-medium bg-slate-800 px-3 py-1.5 rounded-full" dir="ltr">
              <ShieldAlert className="w-4 h-4" />
              <span>IFAB 2025/26</span>
            </div>
            <button
              onClick={() => setLang(lang === 'fr' ? 'ar' : 'fr')}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-full transition-colors text-sm font-medium"
            >
              <Globe className="w-4 h-4" />
              {lang === 'fr' ? 'العربية' : 'Français'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Input Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-md">
          <div className="p-5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Gavel className="w-5 h-5 text-slate-600" />
              {lang === 'fr' ? 'Nouvelle Analyse' : 'تحليل جديد'}
            </h2>
          </div>
          
          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            <div>
              <label htmlFor="situation" className="block text-sm font-medium text-slate-700 mb-2">
                {lang === 'fr' ? 'Décrivez la situation (optionnel si fichier joint)' : 'صف الحالة (اختياري إذا تم إرفاق ملف)'}
              </label>
              <div className="relative">
                <textarea
                  id="situation"
                  rows={4}
                  className="w-full rounded-xl border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-slate-50 p-4 pb-12 text-slate-800 placeholder-slate-400 border transition-colors resize-y"
                  placeholder={lang === 'fr' ? 'Ex: Un attaquant est en position de hors-jeu...' : 'مثال: مهاجم في موقف تسلل...'}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`absolute bottom-3 ${lang === 'ar' ? 'left-3' : 'right-3'} p-2 rounded-full transition-colors ${isRecording ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                  title={lang === 'fr' ? (isRecording ? 'Arrêter la dictée' : 'Dicter') : (isRecording ? 'إيقاف الإملاء' : 'إملاء')}
                >
                  {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">
                  {lang === 'fr' ? 'Fichier Multimédia' : 'ملف وسائط'}
                </span>
              </div>
              
              {!file ? (
                <div 
                  className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 hover:border-blue-400 transition-colors cursor-pointer group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex justify-center gap-4 mb-3 text-slate-400 group-hover:text-blue-500 transition-colors">
                    <Video className="w-8 h-8" />
                    <ImageIcon className="w-8 h-8" />
                  </div>
                  <p className="text-sm text-slate-600 font-medium">
                    {lang === 'fr' ? 'Cliquez pour ajouter une vidéo ou une image' : 'انقر لإضافة فيديو أو صورة'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {lang === 'fr' ? '(Max 50MB Vidéo / 4MB Image)' : '(الحد الأقصى 50 ميجابايت للفيديو / 4 ميجابايت للصورة)'}
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-200">
                  <div className="flex items-center gap-4 overflow-hidden">
                    {file.type.startsWith('image/') ? (
                      <div className="w-14 h-14 rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-white">
                        <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center shrink-0 border border-blue-200">
                        <Video className="w-7 h-7 text-blue-600" />
                      </div>
                    )}
                    <div className="truncate" dir="ltr">
                      <p className="text-sm font-semibold text-slate-800 truncate text-left">{file.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5 text-left">{(file.size / (1024 * 1024)).toFixed(2)} MB • {file.type}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                    disabled={loading}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*,video/*"
                className="hidden"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-start gap-3 border border-red-100">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || (!text.trim() && !file)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>
                      {extracting 
                        ? (lang === 'fr' ? 'Extraction des images...' : 'جاري استخراج الصور...') 
                        : (lang === 'fr' ? 'Analyse en cours...' : 'جاري التحليل...')}
                    </span>
                  </>
                ) : (
                  <>
                    <Send className={`w-5 h-5 ${lang === 'ar' ? '-scale-x-100' : ''}`} />
                    <span>{lang === 'fr' ? 'Analyser la situation' : 'تحليل الحالة'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Output Card */}
        {result && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-600" />
                {lang === 'fr' ? "Rapport d'Arbitrage" : 'تقرير التحكيم'}
              </h2>
            </div>
            <div className={`p-6 prose prose-slate max-w-none prose-p:leading-relaxed prose-headings:text-slate-800 prose-strong:text-slate-900 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
            {/* Feedback Section */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-sm font-medium text-slate-600">
                {feedback 
                  ? (lang === 'fr' ? 'Merci pour votre retour !' : 'شكراً لملاحظاتك!') 
                  : (lang === 'fr' ? 'Cette analyse est-elle utile ?' : 'هل كان هذا التحليل مفيداً؟')}
              </span>
              <div className="flex items-center gap-2" dir="ltr">
                <button
                  onClick={() => setFeedback('up')}
                  disabled={feedback !== null}
                  className={`p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium ${feedback === 'up' ? 'bg-green-100 text-green-700' : feedback === 'down' ? 'opacity-50 cursor-not-allowed text-slate-400' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                  title={lang === 'fr' ? 'Oui, utile' : 'نعم، مفيد'}
                >
                  <ThumbsUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setFeedback('down')}
                  disabled={feedback !== null}
                  className={`p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium ${feedback === 'down' ? 'bg-red-100 text-red-700' : feedback === 'up' ? 'opacity-50 cursor-not-allowed text-slate-400' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                  title={lang === 'fr' ? 'Non, pas utile' : 'لا، غير مفيد'}
                >
                  <ThumbsDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
