import React, { useState, useRef, useEffect } from 'react';
import { PPTData, PPTSlide, PPTConfig, defaultPPTConfig, defaultPPTSlide, ResumeData } from '../types';
import { aiService } from '../services/ai_optimize';
import { apiService } from '../services/api';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Download,
  Upload,
  Plus,
  Trash2,
  Edit3,
  Eye,
  Settings,
  FileText,
  Image,
  Palette,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  Save,
  Wand2,
  Monitor,
  Smartphone,
  Tablet
} from 'lucide-react';
import html2pdf from "html2pdf.js";

interface PPTMakerProps {
  resumeData?: ResumeData;
  onClose?: () => void;
}

export function PPTMaker({ resumeData, onClose }: PPTMakerProps) {
  const [pptData, setPptData] = useState<PPTData>({
    userId: '',
    title: '我的演示文稿',
    slides: [],
    config: defaultPPTConfig,
  });

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [userPPTs, setUserPPTs] = useState<any[]>([]);
  const [selectedPPTId, setSelectedPPTId] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);

  // 初始化PPT数据
  useEffect(() => {
    loadPPTData();
  }, []);

  // 自动播放逻辑
  useEffect(() => {
    if (isPlaying && pptData.slides.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentSlideIndex(prev => (prev + 1) % pptData.slides.length);
      }, pptData.config.autoPlayInterval);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, pptData.config.autoPlayInterval, pptData.slides.length]);

  const handleFullscreenKeydown = (event: KeyboardEvent) => {
    if (!isFullscreen || pptData.slides.length === 0) return;
    const key = event.key;
    if (key === 'ArrowRight' || key === 'ArrowDown') {
      setCurrentSlideIndex(prev => Math.min(pptData.slides.length - 1, prev + 1));
      event.preventDefault();
    } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
      setCurrentSlideIndex(prev => Math.max(0, prev - 1));
      event.preventDefault();
    }
  };

  const handleFullscreenClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isFullscreen || pptData.slides.length === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    if (clickX > rect.width / 2) {
      setCurrentSlideIndex(prev => Math.min(pptData.slides.length - 1, prev + 1));
    } else {
      setCurrentSlideIndex(prev => Math.max(0, prev - 1));
    }
  };

  // 全屏模式
  useEffect(() => {
    if (isFullscreen && fullscreenRef.current) {
      fullscreenRef.current.requestFullscreen?.();
    } else if (document.fullscreenElement) {
      document.exitFullscreen?.();
    }
  }, [isFullscreen]);

  useEffect(() => {
    if (!isFullscreen) return;
    document.addEventListener('keydown', handleFullscreenKeydown);
    return () => {
      document.removeEventListener('keydown', handleFullscreenKeydown);
    };
  }, [isFullscreen, pptData.slides.length]);

  const loadPPTData = async () => {
    try {
      // 从后端加载用户的PPT数据列表
      const pptList = await apiService.getUserPPTs();
      setUserPPTs(pptList);
      if (pptList.length > 0 && !pptData.id) {
        // 如果没有当前PPT，选择第一个
        setSelectedPPTId(pptList[0].id);
        // 确保config字段存在
        const pptWithConfig = {
          ...pptList[0],
          config: pptList[0].config || defaultPPTConfig
        };
        setPptData(pptWithConfig);
      }
    } catch (error) {
      console.error('加载PPT数据失败:', error);
    }
  };

  const loadSelectedPPT = async (pptId: string) => {
    try {
      const selectedPPT = userPPTs.find(ppt => ppt.id === pptId);
      if (selectedPPT) {
        // 确保config字段存在，如果不存在则使用默认配置
        const pptWithConfig = {
          ...selectedPPT,
          config: selectedPPT.config || defaultPPTConfig
        };
        setPptData(pptWithConfig);
        setSelectedPPTId(pptId);
        setCurrentSlideIndex(0);
      }
    } catch (error) {
      console.error('加载PPT失败:', error);
    }
  };

  const createNewPPT = () => {
    const newPPT: PPTData = {
      userId: '',
      title: '我的演示文稿',
      slides: [],
      config: defaultPPTConfig,
    };
    setPptData(newPPT);
    setSelectedPPTId('');
    setCurrentSlideIndex(0);
  };

  const savePPTData = async () => {
    try {
      let savedPPT;
      if (pptData.id) {
        await apiService.updatePPT(pptData.id, pptData);
        savedPPT = pptData;
      } else {
        savedPPT = await apiService.createPPT(pptData);
        setPptData(savedPPT);
        setSelectedPPTId(savedPPT.id);
      }
      
      // 重新加载PPT列表
      await loadPPTData();
      alert('PPT保存成功！');
    } catch (error) {
      console.error('保存PPT失败:', error);
      alert('保存失败，请重试');
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        alert('只支持PDF、DOC、DOCX、JPG、PNG格式的文件');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert('文件大小不能超过10MB');
        return;
      }
      setUploadedFile(file);
    }
  };

  const getThemeStyle = (theme: PPTConfig['theme']) => {
    switch (theme) {
      case 'professional':
        return {
          background: 'linear-gradient(135deg, #0d3b66 0%, #1d7bb6 45%, #3b90e6 100%)',
          panel: 'rgba(255,255,255,0.92)',
          accent: '#ffd166',
          text: '#171717'
        };
      case 'modern':
        return {
          background: 'linear-gradient(135deg, #2a2d34 0%, #0f172a 100%)',
          panel: 'rgba(15,23,42,0.9)',
          accent: '#38bdf8',
          text: '#f8fafc'
        };
      case 'creative':
        return {
          background: 'radial-gradient(circle at top left, #f97316 0%, #ec4899 40%, #8b5cf6 100%)',
          panel: 'rgba(255,255,255,0.88)',
          accent: '#10b981',
          text: '#111827'
        };
      case 'elegant':
        return {
          background: 'linear-gradient(135deg, #27272a 0%, #4b5563 35%, #9ca3af 100%)',
          panel: 'rgba(255,255,255,0.92)',
          accent: '#f43f5e',
          text: '#292a2a'
        };
      case 'minimal':
        return {
          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
          panel: 'rgba(255,255,255,0.95)',
          accent: '#2563eb',
          text: '#111827'
        };
      default:
        return {
          background: pptData.config.backgroundColor,
          panel: 'rgba(255,255,255,0.92)',
          accent: pptData.config.secondaryColor,
          text: pptData.config.textColor
        };
    }
  };

  const themeStyle = getThemeStyle(pptData.config.theme);

  const generatePPTFromContent = async () => {
    if (!aiPrompt.trim() && !uploadedFile && !resumeData) {
      alert('请输入内容、上传文件或选择使用简历数据');
      return;
    }

    setIsGenerating(true);
    try {
      let generatedData;

      if (uploadedFile) {
        // 从文件生成PPT
        generatedData = await aiService.generatePPTFromFile(uploadedFile, aiPrompt);
        setPptData(prev => ({
          ...prev,
          title: generatedData.title || prev.title,
          slides: generatedData.slides || [],
          config: { ...prev.config, ...generatedData.config }
        }));
      } else if (resumeData) {
        // 从简历数据生成PPT
        const generatedData = await aiService.generatePPTFromResume(resumeData, aiPrompt);
        setPptData(prev => ({
          ...prev,
          title: generatedData.title || prev.title,
          slides: generatedData.slides || [],
          config: { ...prev.config, ...generatedData.config }
        }));
      } else {
        // 从文本生成PPT
        const generatedData = await aiService.generatePPTFromText(aiPrompt);
        setPptData(prev => ({
          ...prev,
          title: generatedData.title || prev.title,
          slides: generatedData.slides || [],
          config: { ...prev.config, ...generatedData.config }
        }));
      }

      alert('PPT生成成功！');
    } catch (error) {
      console.error('生成PPT失败:', error);
      alert('生成失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  };

  const addNewSlide = () => {
    const newSlide: PPTSlide = {
      ...defaultPPTSlide,
      id: Date.now().toString(),
      title: `幻灯片 ${pptData.slides.length + 1}`,
    };
    setPptData(prev => ({
      ...prev,
      slides: [...prev.slides, newSlide]
    }));
    setCurrentSlideIndex(pptData.slides.length);
    setIsEditing(true);
  };

  const updateSlide = (slideId: string, updates: Partial<PPTSlide>) => {
    setPptData(prev => ({
      ...prev,
      slides: prev.slides.map(slide =>
        slide.id === slideId ? { ...slide, ...updates } : slide
      )
    }));
  };

  const deleteSlide = (slideId: string) => {
    setPptData(prev => ({
      ...prev,
      slides: prev.slides.filter(slide => slide.id !== slideId)
    }));
    if (currentSlideIndex >= pptData.slides.length - 1) {
      setCurrentSlideIndex(Math.max(0, pptData.slides.length - 2));
    }
  };

  const exportPPT = async (format: 'html' | 'pdf') => {
    try {
      if (format === 'html') {
        const htmlContent = generateHTMLExport();
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${pptData.title}.html`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === 'pdf') {
        // 使用html2pdf库导出PDF
        const element = document.getElementById('ppt-preview');
        if (element) {
          const opt = {
            margin: 0.5,
            filename: `${pptData.title}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
              scale: 2,
              useCORS: true,
              allowTaint: true,
              backgroundColor: pptData.config.backgroundColor
            },
            jsPDF: {
              unit: 'in',
              format: 'a4',
              orientation: 'landscape',
              compress: true
            }
          };
          await html2pdf().set(opt).from(element).save();
        }
      }
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    }
  };

  const generateHTMLExport = () => {
    const exportThemeStyle = getThemeStyle(pptData.config.theme);
    const slides = pptData.slides.map((slide, index) => `
      <div class="slide" style="
        background: ${slide.backgroundColor || exportThemeStyle.background};
        color: ${slide.textColor || pptData.config.textColor};
        font-family: ${pptData.config.fontFamily};
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        padding: 2rem;
      ">
        <div style="background: ${slide.backgroundColor ? 'transparent' : exportThemeStyle.panel}; border-radius: 32px; box-shadow: 0 30px 60px rgba(0,0,0,0.12); padding: 3rem; max-width: 1000px; width: 100%;">
          <h1 style="font-size: 3rem; margin-bottom: 1.5rem; color: ${pptData.config.headingColor || pptData.config.primaryColor}; font-family: ${pptData.config.headingFontFamily || pptData.config.fontFamily};">${slide.title}</h1>
          <div style="font-size: 1.4rem; line-height: 1.8; max-width: 800px; color: ${slide.textColor || pptData.config.textColor}; text-align: left;">${slide.content.replace(/\n/g, '<br>')}</div>
          ${slide.imageUrl ? `<img src="${slide.imageUrl}" style="max-width: 100%; margin-top: 2rem; border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.15);" />` : ''}
        </div>
      </div>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${pptData.title}</title>
        <style>
          body { margin: 0; font-family: ${pptData.config.fontFamily}; background: ${exportThemeStyle.background}; color: ${pptData.config.textColor}; }
          .slide { display: none; align-items: center; justify-content: center; }
          .slide.active { display: flex; }
          .controls {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 10px;
            background: rgba(0,0,0,0.72);
            padding: 10px;
            border-radius: 6px;
          }
          .controls button {
            background: white;
            border: none;
            padding: 10px 16px;
            cursor: pointer;
            border-radius: 4px;
            font-size: 1rem;
          }
        </style>
      </head>
      <body>
        ${slides}
        <div class="controls">
          <button onclick="prevSlide()">上一页</button>
          <button onclick="nextSlide()">下一页</button>
        </div>
        <script>
          let currentSlide = 0;
          const slides = document.querySelectorAll('.slide');
          slides[0].classList.add('active');

          function showSlide(index) {
            slides.forEach(slide => slide.classList.remove('active'));
            slides[index].classList.add('active');
          }

          function nextSlide() {
            currentSlide = (currentSlide + 1) % slides.length;
            showSlide(currentSlide);
          }

          function prevSlide() {
            currentSlide = (currentSlide - 1 + slides.length) % slides.length;
            showSlide(currentSlide);
          }

          document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight' || e.key === ' ') nextSlide();
            if (e.key === 'ArrowLeft') prevSlide();
          });
        </script>
      </body>
      </html>
    `;
  };

  const currentSlide = pptData.slides[currentSlideIndex];

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 顶部工具栏 */}
      <div className="bg-white border-b px-4 py-3 flex items-center flex-wrap justify-between">
        <div className="flex items-center flex-wrap gap-4">
          <h1 className="text-xl font-bold text-gray-800">AI PPT</h1>
          
          {/* PPT选择器 */}
          <div className="flex items-center gap-2">
            <select
              value={selectedPPTId}
              onChange={(e) => {
                if (e.target.value === 'new') {
                  createNewPPT();
                } else {
                  loadSelectedPPT(e.target.value);
                }
              }}
              className="border rounded px-3 py-1 text-sm"
            >
              <option value="">选择PPT</option>
              {userPPTs.map(ppt => (
                <option key={ppt.id} value={ppt.id}>
                  {ppt.title}
                </option>
              ))}
              <option value="new">+ 新建PPT</option>
            </select>
          </div>
          
          <input
            type="text"
            value={pptData.title}
            onChange={(e) => setPptData(prev => ({ ...prev, title: e.target.value }))}
            className="border rounded px-3 py-1 text-sm"
            placeholder="PPT标题"
          />
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={savePPTData}
            className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            <Save size={16} />
            保存
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 px-3 py-1 border rounded text-sm hover:bg-gray-50"
          >
            <Settings size={16} />
            设置
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="flex items-center gap-2 px-3 py-1 border rounded text-sm hover:bg-gray-50"
          >
            <Monitor size={16} />
            全屏
          </button>

          <div className="flex items-center gap-1 border-l pl-2 ml-2">
            <button
              onClick={() => exportPPT('html')}
              className="flex items-center gap-2 px-3 py-1 border rounded text-sm hover:bg-gray-50"
            >
              <Download size={16} />
              HTML
            </button>
            <button
              onClick={() => exportPPT('pdf')}
              className="flex items-center gap-2 px-3 py-1 border rounded text-sm hover:bg-gray-50"
            >
              <Download size={16} />
              PDF
            </button>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-3 py-1 border rounded text-sm hover:bg-gray-50 text-red-600"
            >
              <X size={16} />
              关闭
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row">
        {/* 左侧控制面板 */}
        <div className="w-full md:w-80 bg-white border-r flex flex-col">
          {/* AI生成区域 */}
          <div className="p-4 border-b">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Wand2 size={18} />
              AI 生成PPT
            </h3>

            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="输入PPT主题和内容要求..."
              className="w-full border rounded p-2 h-20 text-sm mb-3"
            />

            {/* 文件上传 */}
            <div className="mb-3">
              <label className="block text-sm text-gray-600 mb-2">或上传文档文件</label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50 w-full justify-center"
              >
                <Upload size={16} />
                选择文件
              </button>
              {uploadedFile && (
                <div className="mt-2 text-sm text-gray-600">
                  已选择: {uploadedFile.name}
                </div>
              )}
            </div>

            {/* 生成选项 */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={generatePPTFromContent}
                disabled={isGenerating}
                className="flex-1 bg-purple-600 text-white px-3 py-2 rounded text-sm hover:bg-purple-700 disabled:opacity-50"
              >
                {isGenerating ? '生成中...' : '从文本生成'}
              </button>
              {resumeData && (
                <button
                  onClick={() => generatePPTFromContent()}
                  disabled={isGenerating}
                  className="flex-1 bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 disabled:opacity-50"
                >
                  从简历生成
                </button>
              )}
            </div>
          </div>

          {/* 幻灯片列表 */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">幻灯片列表</h3>
                <button
                  onClick={addNewSlide}
                  className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  <Plus size={14} />
                  添加
                </button>
              </div>

              <div className="space-y-2">
                {pptData.slides.map((slide, index) => (
                  <div
                    key={slide.id}
                    onClick={() => setCurrentSlideIndex(index)}
                    className={`p-3 border rounded cursor-pointer hover:bg-gray-50 ${
                      index === currentSlideIndex ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 overflow-hidden">
                        <div className="text-sm font-medium truncate">{slide.title || `幻灯片 ${index + 1}`}</div>
                        <div className="text-xs text-gray-500 truncate">{slide.content.substring(0, 30)}...</div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSlide(slide.id);
                        }}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 设置面板 */}
          {showSettings && (
            <div className="border-t p-4">
              <h3 className="font-semibold mb-3">PPT 设置</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">主题风格</label>
                  <select
                    value={pptData.config.theme}
                    onChange={(e) => setPptData(prev => ({
                      ...prev,
                      config: { ...prev.config, theme: e.target.value as any }
                    }))}
                    className="w-full border rounded px-2 py-1 text-sm"
                  >
                    <option value="professional">专业</option>
                    <option value="modern">现代</option>
                    <option value="creative">创意</option>
                    <option value="elegant">优雅</option>
                    <option value="minimal">极简</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">主色调</label>
                    <input
                      type="color"
                      value={pptData.config.primaryColor}
                      onChange={(e) => setPptData(prev => ({
                        ...prev,
                        config: { ...prev.config, primaryColor: e.target.value }
                      }))}
                      className="w-full h-8 border rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-1">辅助色</label>
                    <input
                      type="color"
                      value={pptData.config.secondaryColor}
                      onChange={(e) => setPptData(prev => ({
                        ...prev,
                        config: { ...prev.config, secondaryColor: e.target.value }
                      }))}
                      className="w-full h-8 border rounded"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">背景色</label>
                    <input
                      type="color"
                      value={pptData.config.backgroundColor}
                      onChange={(e) => setPptData(prev => ({
                        ...prev,
                        config: { ...prev.config, backgroundColor: e.target.value }
                      }))}
                      className="w-full h-8 border rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-1">标题色</label>
                    <input
                      type="color"
                      value={pptData.config.headingColor || pptData.config.primaryColor}
                      onChange={(e) => setPptData(prev => ({
                        ...prev,
                        config: { ...prev.config, headingColor: e.target.value }
                      }))}
                      className="w-full h-8 border rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-1">字体色</label>
                    <input
                      type="color"
                      value={pptData.config.textColor || pptData.config.primaryColor}
                      onChange={(e) => setPptData(prev => ({
                        ...prev,
                        config: { ...prev.config, textColor: e.target.value }
                      }))}
                      className="w-full h-8 border rounded"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">字体</label>
                  <select
                    value={pptData.config.fontFamily}
                    onChange={(e) => setPptData(prev => ({
                      ...prev,
                      config: { ...prev.config, fontFamily: e.target.value }
                    }))}
                    className="w-full border rounded px-2 py-1 text-sm"
                  >
                    <option value="Inter, sans-serif">Inter</option>
                    <option value="Arial, sans-serif">Arial</option>
                    <option value="Helvetica, sans-serif">Helvetica</option>
                    <option value="Times New Roman, serif">Times New Roman</option>
                    <option value="Georgia, serif">Georgia</option>
                    <option value="Verdana, sans-serif">Verdana</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">幻灯片切换</label>
                  <select
                    value={pptData.config.slideTransition}
                    onChange={(e) => setPptData(prev => ({
                      ...prev,
                      config: { ...prev.config, slideTransition: e.target.value as any }
                    }))}
                    className="w-full border rounded px-2 py-1 text-sm"
                  >
                    <option value="fade">淡入淡出</option>
                    <option value="slide-left">左滑</option>
                    <option value="slide-right">右滑</option>
                    <option value="zoom">缩放</option>
                    <option value="none">无</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">自动播放间隔(秒)</label>
                  <input
                    type="number"
                    value={pptData.config.autoPlayInterval / 1000}
                    onChange={(e) => setPptData(prev => ({
                      ...prev,
                      config: { ...prev.config, autoPlayInterval: parseInt(e.target.value) * 1000 }
                    }))}
                    className="w-full border rounded px-2 py-1 text-sm"
                    min="1"
                    max="60"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm text-gray-600">显示选项</label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={pptData.config.showControls}
                        onChange={(e) => setPptData(prev => ({
                          ...prev,
                          config: { ...prev.config, showControls: e.target.checked }
                        }))}
                      />
                      <span className="text-sm">控制栏</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={pptData.config.showProgress}
                        onChange={(e) => setPptData(prev => ({
                          ...prev,
                          config: { ...prev.config, showProgress: e.target.checked }
                        }))}
                      />
                      <span className="text-sm">进度条</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={pptData.config.showSlideNumbers || false}
                        onChange={(e) => setPptData(prev => ({
                          ...prev,
                          config: { ...prev.config, showSlideNumbers: e.target.checked }
                        }))}
                      />
                      <span className="text-sm">页码</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 右侧预览区域 */}
        <div className="flex-1 flex flex-col">
          {/* 演示控制栏 */}
          <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
                disabled={currentSlideIndex === 0}
                className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronLeft size={16} />
              </button>

              <span className="text-sm text-gray-600">
                {currentSlideIndex + 1} / {pptData.slides.length}
              </span>

              <button
                onClick={() => setCurrentSlideIndex(Math.min(pptData.slides.length - 1, currentSlideIndex + 1))}
                disabled={currentSlideIndex === pptData.slides.length - 1}
                className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                disabled={pptData.slides.length <= 1}
                className="flex items-center gap-2 px-3 py-1 border rounded text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                {isPlaying ? '暂停' : '播放'}
              </button>

              <button
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center gap-2 px-3 py-1 border rounded text-sm hover:bg-gray-50"
              >
                <Edit3 size={16} />
                {isEditing ? '预览' : '编辑'}
              </button>
            </div>
          </div>

          {/* 幻灯片预览/编辑区域 */}
          <div className="flex-1 p-4">
            {pptData.slides.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <FileText size={48} className="mx-auto mb-4 opacity-50" />
                  <p>暂无幻灯片，请先添加或生成</p>
                </div>
              </div>
            ) : (
              <div
                ref={fullscreenRef}
                id="ppt-preview"
                className="h-full flex flex-col rounded-lg shadow-lg overflow-hidden relative cursor-pointer"
                onClick={isFullscreen ? handleFullscreenClick : undefined}
                style={{
                  background: currentSlide?.backgroundColor || themeStyle.background,
                  fontFamily: pptData.config.fontFamily,
                  color: currentSlide?.textColor || pptData.config.textColor,
                }}
              >
                {isEditing ? (
                  <div className="flex-1 p-8 flex flex-col">
                    <input
                      type="text"
                      value={currentSlide?.title || ''}
                      onChange={(e) => updateSlide(currentSlide.id, { title: e.target.value })}
                      className="text-4xl font-bold mb-6 border-none outline-none bg-transparent"
                      style={{
                        color: pptData.config.headingColor || pptData.config.primaryColor,
                        fontFamily: pptData.config.headingFontFamily || pptData.config.fontFamily
                      }}
                      placeholder="幻灯片标题"
                    />
                    <textarea
                      value={currentSlide?.content || ''}
                      onChange={(e) => updateSlide(currentSlide.id, { content: e.target.value })}
                      className="flex-1 text-xl leading-relaxed border-none outline-none bg-transparent resize-none"
                      style={{ color: (currentSlide?.textColor || pptData.config.textColor) || themeStyle.text }}
                      placeholder="幻灯片内容"
                    />
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col justify-center items-center p-12 text-center"
                    style={{
                      background: themeStyle.panel,
                      borderRadius: 32,
                      boxShadow: '0 30px 80px rgba(0,0,0,0.14)',
                      padding: '4rem',
                      margin: '1rem',
                    }}
                  >
                    <h1
                      className="text-6xl font-bold mb-8 max-w-4xl leading-tight"
                      style={{
                        color: pptData.config.headingColor || pptData.config.primaryColor,
                        fontFamily: pptData.config.headingFontFamily || pptData.config.fontFamily,
                        textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                    >
                      {currentSlide?.title}
                    </h1>
                    <div
                      className="text-2xl leading-relaxed max-w-5xl"
                      style={{
                        color: (currentSlide?.textColor || pptData.config.textColor) || themeStyle.text,
                        lineHeight: '1.8',
                        textAlign: currentSlide?.layout === 'left' ? 'left' : currentSlide?.layout === 'right' ? 'right' : 'center'
                      }}
                    >
                      {currentSlide?.content.split('\n').map((line, index) => {
                        // 处理列表项
                        if (line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().match(/^\d+\./)) {
                          return (
                            <div key={index} className="text-left mb-4 pl-8" style={{ textAlign: 'left' }}>
                              {line}
                            </div>
                          );
                        }
                        return (
                          <div key={index} className="mb-6">
                            {line}
                          </div>
                        );
                      })}
                    </div>
                    {currentSlide?.imageUrl && (
                      <img
                        src={currentSlide.imageUrl}
                        alt="幻灯片图片"
                        className="max-w-full max-h-64 mt-8 rounded-lg shadow-lg"
                      />
                    )}
                    {pptData.config.showSlideNumbers && (
                      <div className="absolute bottom-4 right-4 text-sm opacity-60" style={{ color: pptData.config.textColor }}>
                        {currentSlideIndex + 1} / {pptData.slides.length}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}