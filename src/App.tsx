import { useState, useRef, FormEvent, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Upload, Video, Image as ImageIcon, Send, AlertCircle, Loader2, X, FileText, Gavel, ShieldAlert, Languages, Mic, Lightbulb, ThumbsUp, ThumbsDown, Sun, Moon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

type Language = 'fr' | 'ar';

const getSystemInstruction = (lang: Language) => {
  if (lang === 'fr') {
    return `Tu es un expert arbitral FIFA/IFAB 2025/26.

TON RÔLE:
1. Analyser les situations de jeu (vidéo/image/texte)
2. Identifier les lois applicables
3. Fournir des décisions conformes aux règles
4. Expliquer clairement en Français
5. Citer les articles spécifiques des Lois du Jeu
6. Évaluer si la situation nécessite l'intervention de la VAR selon le protocole IFAB

TON STYLE:
- Professionnel et précis
- Pédagogique
- Neutre et objectif
- Basé uniquement sur les règles officielles
- Rapide et concis

STRUCTURE DE RÉPONSE OBLIGATOIRE (utilise exactement ce format avec les emojis, en gras pour les titres) :
**📋 Situation:** [Description]
**⚽ Loi applicable:** [Numéro + Titre]
**📖 Article:** [Référence précise]
**✅ Décision:** [Coup franc/Penalty/etc.]
**🟨 Sanction:** [Aucune/Jaune/Rouge]
**📺 Recommandation VAR:** [Oui/Non - Justification selon le protocole IFAB]
**💡 Explication:** [Texte français]

LIMITES:
- Ne jamais inventer de règles
- Toujours se référer aux Lois 2025/26
- Signaler les situations ambiguës`;
  } else {
    return `أنت خبير تحكيم فيفا/إيفاب 2025/26.

دورك:
1. تحليل حالات اللعب (فيديو/صورة/نص)
2. تحديد القوانين المعمول بها
3. تقديم قرارات تتوافق مع القواعد
4. الشرح بوضوح باللغة العربية
5. الاستشهاد بمواد محددة من قوانين اللعبة
6. تقييم ما إذا كانت الحالة تتطلب تدخل تقنية الفيديو (VAR) وفقاً لبروتوكول إيفاب

أسلوبك:
- احترافي ودقيق
- تعليمي
- محايد وموضوعي
- يعتمد فقط على القواعد الرسمية
- سريع وموجز

هيكل الاستجابة الإلزامي (استخدم هذا التنسيق بالضبط مع الرموز التعبيرية، والخط العريض للعناوين):
**📋 الحالة:** [الوصف]
**⚽ القانون المطبق:** [الرقم + العنوان]
**📖 المادة:** [مرجع دقيق]
**✅ القرار:** [ركلة حرة/ركلة جزاء/إلخ]
**🟨 العقوبة:** [لا شيء/بطاقة صفراء/بطاقة حمراء]
**📺 توصية تقنية الفيديو (VAR):** [نعم/لا - التبرير وفقاً لبروتوكول إيفاب]
**💡 الشرح:** [النص العربي]

الحدود:
- لا تخترع قواعد أبدًا
- ارجع دائمًا إلى قوانين 2025/26
- أشر إلى الحالات الغامضة`;
  }
};

const translations = {
  fr: {
    title: "Expert FIFA",
    subtitle: "Arbitrage IFAB 2025/26",
    newAnalysis: "Nouvelle Analyse",
    describeSituation: "Décrivez la situation (optionnel si fichier joint)",
    placeholder: "Ex: Un attaquant est en position de hors-jeu mais le ballon est dévié par un défenseur...",
    mediaFile: "Fichier Multimédia",
    clickToAdd: "Cliquez pour ajouter une vidéo ou une image",
    maxSize: "(Max 20MB)",
    fileTooLarge: "Le fichier est trop volumineux (max 20MB).",
    pleaseDescribe: "Veuillez décrire la situation ou télécharger un fichier.",
    analyzing: "Analyse en cours...",
    analyzeBtn: "Analyser la situation",
    report: "Rapport d'Arbitrage",
    noResponse: "Aucune réponse générée.",
    error: "Une erreur s'est produite lors de l'analyse.",
    defaultPrompt: "Analyse cette situation d'arbitrage selon les lois du jeu.",
    startDictation: "Commencer la dictée vocale",
    stopDictation: "Arrêter la dictée vocale",
    listening: "Écoute en cours...",
    micError: "Microphone non supporté ou accès refusé.",
    tryExample: "Essayer un exemple",
    helpful: "Cette analyse vous a-t-elle été utile ?",
    thanksFeedback: "Merci pour votre retour !",
    tooltipLangFr: "Passer l'interface en français",
    tooltipLangAr: "Passer l'interface en arabe",
    tooltipUpload: "Téléchargez une image ou une vidéo pour analyse",
    tooltipMic: "Utilisez votre microphone pour décrire la situation",
    tooltipThemeLight: "Passer au thème clair",
    tooltipThemeDark: "Passer au thème sombre"
  },
  ar: {
    title: "خبير الفيفا",
    subtitle: "تحكيم إيفاب 2025/26",
    newAnalysis: "تحليل جديد",
    describeSituation: "صف الحالة (اختياري إذا تم إرفاق ملف)",
    placeholder: "مثال: مهاجم في موقف تسلل ولكن الكرة انحرفت من قبل مدافع...",
    mediaFile: "ملف وسائط",
    clickToAdd: "انقر لإضافة فيديو أو صورة",
    maxSize: "(الحد الأقصى 20 ميجابايت)",
    fileTooLarge: "الملف كبير جداً (الحد الأقصى 20 ميجابايت).",
    pleaseDescribe: "يرجى وصف الحالة أو رفع ملف.",
    analyzing: "جاري التحليل...",
    analyzeBtn: "تحليل الحالة",
    report: "تقرير التحكيم",
    noResponse: "لم يتم إنشاء أي رد.",
    error: "حدث خطأ أثناء التحليل.",
    defaultPrompt: "حلل هذه الحالة التحكيمية وفقاً لقوانين اللعبة.",
    startDictation: "بدء الإملاء الصوتي",
    stopDictation: "إيقاف الإملاء الصوتي",
    listening: "جاري الاستماع...",
    micError: "الميكروفون غير مدعوم أو تم رفض الوصول.",
    tryExample: "تجربة مثال",
    helpful: "هل كان هذا التحليل مفيداً؟",
    thanksFeedback: "شكراً لملاحظاتك!",
    tooltipLangFr: "تبديل الواجهة إلى الفرنسية",
    tooltipLangAr: "تبديل الواجهة إلى العربية",
    tooltipUpload: "قم بتحميل صورة أو فيديو للتحليل",
    tooltipMic: "استخدم الميكروفون لوصف الحالة",
    tooltipThemeLight: "التبديل إلى الوضع الفاتح",
    tooltipThemeDark: "التبديل إلى الوضع الداكن"
  }
};

const examples = {
  fr: [
    "Un attaquant tire au but. Le ballon frappe le bras d'un défenseur qui était collé à son corps. L'arbitre doit-il siffler penalty ?",
    "Lors d'un penalty, le gardien s'avance avant la frappe et arrête le ballon. Que doit décider l'arbitre ?",
    "Un joueur effectue une touche directement dans le but adverse sans que personne ne touche le ballon. Quelle est la décision ?",
    "Un défenseur tacle un attaquant dans la surface de réparation. Il touche le ballon en premier mais emporte ensuite violemment l'attaquant. Quelle est la décision ?"
  ],
  ar: [
    "مهاجم يسدد نحو المرمى. تصطدم الكرة بذراع مدافع كانت ملتصقة بجسده. هل يجب على الحكم احتساب ركلة جزاء؟",
    "أثناء تنفيذ ركلة جزاء، يتقدم حارس المرمى قبل التسديد ويتصدى للكرة. ماذا يجب أن يقرر الحكم؟",
    "لاعب ينفذ رمية تماس مباشرة في مرمى الخصم دون أن يلمس أي شخص الكرة. ما هو القرار؟",
    "مدافع يعرقل مهاجماً داخل منطقة الجزاء. يلمس الكرة أولاً لكنه يسقط المهاجم بعنف بعد ذلك. ما هو القرار؟"
  ]
};

export default function App() {
  const [lang, setLang] = useState<Language>('fr');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const t = translations[lang];
  const isRtl = lang === 'ar';

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        
        recognition.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
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
          if (event.error !== 'no-speech') {
             setIsListening(false);
          }
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setError(t.micError);
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.lang = lang === 'fr' ? 'fr-FR' : 'ar-SA';
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error(err);
        setIsListening(false);
      }
    }
  };

  const handleTryExample = () => {
    const currentExamples = examples[lang];
    const randomExample = currentExamples[Math.floor(Math.random() * currentExamples.length)];
    setText(randomExample);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 20 * 1024 * 1024) {
        setError(t.fileTooLarge);
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !file) {
      setError(t.pleaseDescribe);
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
        parts.push({ text: t.defaultPrompt });
      }

      if (file) {
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

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: { parts },
        config: {
          systemInstruction: getSystemInstruction(lang),
          temperature: 0.2,
        },
      });

      setResult(response.text || t.noResponse);
    } catch (err: any) {
      console.error(err);
      setError(err.message || t.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-yellow-200 dark:selection:bg-yellow-900/50 transition-colors duration-200 ${isRtl ? 'rtl' : 'ltr'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="bg-slate-900 dark:bg-slate-950 text-white py-6 shadow-md sticky top-0 z-10 border-b border-transparent dark:border-slate-800 transition-colors duration-200">
        <div className="max-w-3xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative w-10 h-10 flex items-center justify-center">
              <div className="absolute w-8 h-10 bg-yellow-400 rounded-sm shadow-sm transform -rotate-12 translate-x-1"></div>
              <div className="absolute w-8 h-10 bg-red-500 rounded-sm shadow-sm transform rotate-6 -translate-x-1"></div>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight leading-tight">
                {t.title}
              </h1>
              <p className="text-slate-400 text-sm font-medium">{t.subtitle}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Theme Switcher */}
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              title={theme === 'light' ? t.tooltipThemeDark : t.tooltipThemeLight}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full border border-slate-700 transition-colors"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {/* Language Switcher */}
            <div className="flex items-center bg-slate-800 rounded-full p-1 border border-slate-700">
              <button
                onClick={() => setLang('fr')}
                title={t.tooltipLangFr}
                className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                  lang === 'fr' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
                dir="ltr"
              >
                FR
              </button>
              <button
                onClick={() => setLang('ar')}
                title={t.tooltipLangAr}
                className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                  lang === 'ar' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
                dir="ltr"
              >
                AR
              </button>
            </div>
            
            <div className="hidden sm:flex items-center gap-2 text-slate-400 text-sm font-medium bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
              <ShieldAlert className="w-4 h-4" />
              <span dir="ltr">IFAB 2025/26</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Input Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-all hover:shadow-md">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 flex items-center gap-2">
            <Gavel className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              {t.newAnalysis}
            </h2>
          </div>
          
          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="situation" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t.describeSituation}
                </label>
                <button
                  type="button"
                  onClick={handleTryExample}
                  className="text-xs flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-2.5 py-1.5 rounded-md transition-colors"
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>{t.tryExample}</span>
                </button>
              </div>
              <div className="relative">
                <textarea
                  id="situation"
                  rows={4}
                  className="w-full rounded-xl border-slate-300 dark:border-slate-700 shadow-sm focus:border-blue-500 dark:focus:border-blue-500 focus:ring-blue-500 dark:focus:ring-blue-500/50 bg-slate-50 dark:bg-slate-950 p-4 pb-14 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 border transition-colors resize-y"
                  placeholder={t.placeholder}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  disabled={loading}
                  dir={isRtl ? 'rtl' : 'ltr'}
                />
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`absolute ${isRtl ? 'left-3' : 'right-3'} bottom-3 p-2.5 rounded-full transition-colors flex items-center justify-center ${
                    isListening 
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 animate-pulse shadow-sm' 
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'
                  }`}
                  title={isListening ? t.stopDictation : t.tooltipMic}
                >
                  <Mic className="w-5 h-5" />
                </button>
              </div>
              {isListening && (
                <p className={`text-xs text-red-500 dark:text-red-400 mt-2 font-medium animate-pulse ${isRtl ? 'text-right' : 'text-left'}`}>
                  {t.listening}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.mediaFile}</span>
              </div>
              
              {!file ? (
                <div 
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer group"
                  onClick={() => fileInputRef.current?.click()}
                  title={t.tooltipUpload}
                >
                  <div className="flex justify-center gap-4 mb-3 text-slate-400 dark:text-slate-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                    <Video className="w-8 h-8" />
                    <ImageIcon className="w-8 h-8" />
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">{t.clickToAdd}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1" dir="ltr">{t.maxSize}</p>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-between border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-4 overflow-hidden">
                    {file.type.startsWith('image/') ? (
                      <div className="w-14 h-14 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-900">
                        <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800/50">
                        <Video className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                      </div>
                    )}
                    <div className="truncate">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate" dir="ltr">{file.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5" dir="ltr">{(file.size / (1024 * 1024)).toFixed(2)} MB • {file.type}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors shrink-0"
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
              <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-xl flex items-start gap-3 border border-red-100 dark:border-red-900/30">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || (!text.trim() && !file)}
                className="w-full bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white font-medium py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{t.analyzing}</span>
                  </>
                ) : (
                  <>
                    <Send className={`w-5 h-5 ${isRtl ? 'rotate-180' : ''}`} />
                    <span>{t.analyzeBtn}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Output Card */}
        {result && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-600 dark:text-green-500" />
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                {t.report}
              </h2>
            </div>
            <div className={`p-6 prose prose-slate dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:text-slate-800 dark:prose-headings:text-slate-100 prose-strong:text-slate-900 dark:prose-strong:text-white ${isRtl ? 'text-right' : 'text-left'}`}>
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
            <div className={`bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 p-4 flex items-center justify-between ${isRtl ? 'flex-row-reverse' : ''}`}>
              <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">{feedback ? t.thanksFeedback : t.helpful}</span>
              <div className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <button
                  type="button"
                  onClick={() => setFeedback('up')}
                  disabled={feedback !== null}
                  className={`p-2 rounded-full transition-colors ${feedback === 'up' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300'} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <ThumbsUp className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setFeedback('down')}
                  disabled={feedback !== null}
                  className={`p-2 rounded-full transition-colors ${feedback === 'down' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300'} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <ThumbsDown className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
