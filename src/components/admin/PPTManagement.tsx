import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { Eye, Trash2, Download, Search, Presentation } from 'lucide-react';

export function PPTManagement() {
  const [ppts, setPpts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPPT, setSelectedPPT] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadPPTs();
  }, []);

  const loadPPTs = async () => {
    try {
      setLoading(true);
      const pptList = await apiService.getAdminPPTs();
      setPpts(pptList);
    } catch (error) {
      console.error('加载PPT列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (pptId: string) => {
    if (!confirm('确定要删除这个PPT吗？此操作不可恢复。')) {
      return;
    }

    try {
      await apiService.deletePPT(pptId);
      setPpts(ppts.filter(ppt => ppt.id !== pptId));
      alert('PPT删除成功');
    } catch (error) {
      console.error('删除PPT失败:', error);
      alert('删除失败，请重试');
    }
  };

  const handlePreview = async (ppt: any) => {
    try {
      const fullPPT = await apiService.getPPTById(ppt.id);
      setSelectedPPT(fullPPT);
      setShowPreview(true);
    } catch (error) {
      console.error('加载PPT详情失败:', error);
      alert('加载PPT详情失败');
    }
  };

  const generateHTMLPreview = (ppt: any) => {
    if (!ppt.slides || ppt.slides.length === 0) return '';

    const slides = ppt.slides.map((slide: any, index: number) => `
      <div class="slide" style="
        background-color: ${slide.backgroundColor || ppt.config?.backgroundColor || '#ffffff'};
        color: ${slide.textColor || '#000'};
        font-family: ${ppt.config?.fontFamily || 'Arial'};
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        padding: 2rem;
      ">
        <h1 style="font-size: 3rem; margin-bottom: 1rem; color: ${ppt.config?.primaryColor || '#0066cc'};">${slide.title}</h1>
        <div style="font-size: 1.5rem; line-height: 1.6; max-width: 800px;">${slide.content.replace(/\n/g, '<br>')}</div>
      </div>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${ppt.title}</title>
        <style>
          body { margin: 0; font-family: ${ppt.config?.fontFamily || 'Arial'}; }
          .slide { display: none; }
          .slide.active { display: flex; }
        </style>
      </head>
      <body>
        ${slides}
        <script>
          let currentSlide = 0;
          const slides = document.querySelectorAll('.slide');
          if (slides.length > 0) slides[0].classList.add('active');
        </script>
      </body>
      </html>
    `;
  };

  const filteredPPTs = ppts.filter(ppt =>
    ppt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ppt.user_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">PPT 管理</h2>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索PPT或用户..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* PPT列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PPT标题
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  用户
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  幻灯片数量
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  创建时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPPTs.map((ppt) => (
                <tr key={ppt.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Presentation size={20} className="text-blue-500 mr-3" />
                      <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                        {ppt.title}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {ppt.user_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {ppt.slides ? ppt.slides.length : 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(ppt.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePreview(ppt)}
                        className="text-blue-600 hover:text-blue-900 p-1"
                        title="预览"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => {
                          const html = generateHTMLPreview(ppt);
                          const blob = new Blob([html], { type: 'text/html' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${ppt.title}.html`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="text-green-600 hover:text-green-900 p-1"
                        title="下载HTML"
                      >
                        <Download size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(ppt.id)}
                        className="text-red-600 hover:text-red-900 p-1"
                        title="删除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPPTs.length === 0 && (
          <div className="text-center py-12">
            <Presentation size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">暂无PPT数据</p>
          </div>
        )}
      </div>

      {/* PPT预览模态框 */}
      {showPreview && selectedPPT && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">{selectedPPT.title}</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              {selectedPPT.slides && selectedPPT.slides.length > 0 ? (
                <div className="space-y-4">
                  {selectedPPT.slides.map((slide: any, index: number) => (
                    <div key={index} className="border rounded p-4">
                      <h4 className="font-medium mb-2">幻灯片 {index + 1}: {slide.title}</h4>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{slide.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">暂无幻灯片内容</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}